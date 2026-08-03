import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { buildBulkWhatsApp, type BulkLead } from "@/lib/bulk-messages";
import { buildWaLink } from "@/lib/templates";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stati a cui proporre il contatto WhatsApp (gli altri si escludono).
const DEFAULT_STATUSES = ["NUOVO", "CONTATTATO"];

function waNumber(raw: string | null | undefined): string {
  return (raw ?? "").replace(/[^0-9]/g, "");
}

async function eligibleLeads(onlyNeverContacted: boolean) {
  const leads = await prisma.lead.findMany({
    where: { status: { in: DEFAULT_STATUSES } },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
  });
  let list = leads.filter((l) => waNumber(l.whatsapp).length >= 8);
  if (onlyNeverContacted) {
    const sent = await prisma.generatedMessage.findMany({
      where: { channel: "whatsapp" },
      select: { leadId: true },
    });
    const sentIds = new Set(sent.map((m) => m.leadId));
    list = list.filter((l) => !sentIds.has(l.id));
  }
  return list;
}

// GET: elenco lead pronti per WhatsApp, ognuno con messaggio + link wa.me gia
// pronto. L'utente deve solo aprire e inviare.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyNeverContacted = url.searchParams.get("all") !== "1";
  const settings = await getSettings();
  const list = await eligibleLeads(onlyNeverContacted);

  let conSito = 0;
  let senzaSito = 0;
  const leads = list.map((l) => {
    const msg = buildBulkWhatsApp(l as BulkLead, settings);
    if (msg.kind === "con_sito") conSito++;
    else senzaSito++;
    const num = waNumber(l.whatsapp);
    return {
      leadId: l.id,
      name: l.name,
      city: l.city ?? "",
      category: l.subcategory ?? l.category ?? "",
      priorityScore: l.priorityScore,
      kind: msg.kind,
      waNumber: num,
      body: msg.body,
      waLink: buildWaLink(num, msg.body),
    };
  });

  return NextResponse.json({ ok: true, total: leads.length, conSito, senzaSito, leads });
}

// POST: registra l'invio quando l'utente apre WhatsApp e porta il lead a
// CONTATTATO (approccio semi-automatico, come per le email).
// body: { leadId, body?, waLink? }
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "whatsapp:bulk", 30, 60_000);
  if (rl) return rl;

  const body = await req.json().catch(() => ({}));
  const leadId = asString(body.leadId, 100) ?? "";
  const subject = asString(body.subject, 300) ?? "";
  const msgBody = asString(body.body, 50000) ?? "";
  const channel = asString(body.channel, 20) ?? "whatsapp";
  void subject;
  void channel;

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "leadId mancante" }, { status: 400 });
  }
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  await prisma.generatedMessage.create({
    data: {
      leadId: lead.id,
      channel: "whatsapp",
      body: msgBody,
      waLink: asString(body.waLink, 2000),
      aiUsed: false,
    },
  });
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: "whatsapp",
      description: "Messaggio WhatsApp automatico preparato e aperto",
    },
  });
  if (lead.status === "NUOVO") {
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "CONTATTATO" } });
  }

  return NextResponse.json({ ok: true });
}
