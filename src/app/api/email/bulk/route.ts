import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, smtpConfigured } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { buildBulkEmail, hasUsableWebsite, type BulkLead } from "@/lib/bulk-messages";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Stati a cui inviare di default (gli altri si escludono per sicurezza).
const DEFAULT_STATUSES = ["NUOVO", "CONTATTATO"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toHtml(text: string): string {
  return (
    '<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">' +
    text
      .split("\n")
      .map((line) => (line.trim() ? "<p>" + escapeHtml(line) + "</p>" : "<br/>"))
      .join("") +
    "</div>"
  );
}

async function eligibleLeads(statuses: string[], onlyNeverEmailed: boolean) {
  const leads = await prisma.lead.findMany({
    where: { status: { in: statuses } },
    orderBy: { createdAt: "asc" },
  });
  let list = leads.filter((l) => (l.email ?? "").trim().length > 0);
  if (onlyNeverEmailed) {
    const sent = await prisma.generatedMessage.findMany({
      where: { channel: "email" },
      select: { leadId: true },
    });
    const sentIds = new Set(sent.map((m) => m.leadId));
    list = list.filter((l) => !sentIds.has(l.id));
  }
  return list;
}

// GET: anteprima del numero di lead idonei, divisi per tipo di messaggio.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyNeverEmailed = url.searchParams.get("all") !== "1";
  const list = await eligibleLeads(DEFAULT_STATUSES, onlyNeverEmailed);
  let conSito = 0;
  let senzaSito = 0;
  for (const l of list) {
    if (hasUsableWebsite(l as BulkLead)) conSito++;
    else senzaSito++;
  }
  return NextResponse.json({
    ok: true,
    total: list.length,
    conSito,
    senzaSito,
    smtp: await smtpConfigured(),
  });
}

// POST: invia DAVVERO l'email automatica scegliendo il messaggio giusto per ogni lead.
// body: { onlyNeverEmailed?, statuses?, limit? }
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "email:bulk", 10, 60_000);
  if (rl) return rl;

  const body = await req.json().catch(() => ({}));
  const onlyNeverEmailed = asBoolean(body.onlyNeverEmailed) ?? true;
  const rawStatuses = asArray(body.statuses) ?? [];
  const statuses: string[] = rawStatuses.length
    ? rawStatuses
        .map((x: unknown) => asString(x, 50))
        .filter((x: string | null): x is string => typeof x === "string" && x.length > 0)
    : DEFAULT_STATUSES;
  const limit = (() => {
    const n = asInt(body.limit, 1, 200);
    return n === null ? 50 : n;
  })();

  if (!(await smtpConfigured())) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invio email non configurato. Vai in Impostazioni > Email e inserisci i dati SMTP (per Gmail: una Password per le app).",
      },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  const all = await eligibleLeads(statuses, onlyNeverEmailed);
  const list = all.slice(0, limit);

  let sent = 0;
  let failed = 0;
  let conSito = 0;
  let senzaSito = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (const lead of list) {
    const to = (lead.email ?? "").trim();
    if (!to) continue;
    const mail = buildBulkEmail(lead as BulkLead, settings);
    // Se il lead ha un sito demo generato, lo alleghiamo in automatico all'email.
    const attachments = lead.demoHtml
      ? [
          {
            filename: "anteprima-sito.html",
            content: lead.demoHtml,
            contentType: "text/html; charset=utf-8",
          },
        ]
      : undefined;
    try {
      await sendEmail({
        to,
        subject: mail.subject,
        text: mail.body,
        html: toHtml(mail.body),
        attachments,
      });
      await prisma.generatedMessage.create({
        data: {
          leadId: lead.id,
          channel: "email",
          subject: mail.subject,
          body: mail.body,
          aiUsed: false,
        },
      });
      await prisma.emailLog.create({
        data: {
          leadId: lead.id,
          toEmail: to,
          toName: lead.name,
          subject: mail.subject,
          body: mail.body,
          status: "INVIATO",
          source: "bulk",
        },
      });
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: "email",
          description:
            "Email automatica inviata (" +
            (mail.kind === "con_sito" ? "proposta restyling sito" : "proposta nuovo sito") +
            ")",
        },
      });
      if (lead.status === "NUOVO") {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: "CONTATTATO" },
        });
      }
      sent++;
      if (mail.kind === "con_sito") conSito++;
      else senzaSito++;
    } catch (e) {
      failed++;
      errors.push({ name: lead.name, error: e instanceof Error ? e.message : "Errore invio" });
    }
    // Piccola pausa tra un invio e l'altro per non farsi bloccare dal provider.
    await sleep(700);
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    conSito,
    senzaSito,
    total: list.length,
    remaining: Math.max(0, all.length - list.length),
    errors: errors.slice(0, 10),
  });
}
