import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, smtpConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// POST /api/email/send
// body: { leadId, subject?, body, aiUsed? }
// Invia DAVVERO l'email al lead via SMTP, registra il messaggio + attivita
// e porta il lead da NUOVO a CONTATTATO (flusso semi-automatico).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const lead = await prisma.lead.findUnique({ where: { id: body.leadId } });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }
  if (!lead.email) {
    return NextResponse.json(
      { ok: false, error: "Questo lead non ha un indirizzo email." },
      { status: 400 },
    );
  }
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

  const subject = String(body.subject ?? "").trim() || "Una proposta per " + lead.name;
  const text = String(body.body ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Il testo dell'email e vuoto." },
      { status: 400 },
    );
  }

  const html =
    '<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">' +
    text
      .split("\n")
      .map((line) => (line.trim() ? "<p>" + escapeHtml(line) + "</p>" : "<br/>"))
      .join("") +
    "</div>";

  try {
    const res = await sendEmail({ to: lead.email, subject, text, html });

    await prisma.generatedMessage.create({
      data: {
        leadId: lead.id,
        channel: "email",
        subject,
        body: text,
        aiUsed: Boolean(body.aiUsed),
      },
    });
    await prisma.emailLog.create({
      data: {
        leadId: lead.id,
        toEmail: lead.email,
        toName: lead.name,
        subject,
        body: text,
        status: "INVIATO",
        source: "singola",
      },
    });
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: "email",
        description: "Email inviata a " + lead.email,
      },
    });
    if (lead.status === "NUOVO") {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "CONTATTATO" },
      });
    }

    return NextResponse.json({ ok: true, messageId: res.messageId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore durante l'invio dell'email";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
