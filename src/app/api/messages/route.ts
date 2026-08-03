import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/messages
// body: { leadId, channel, subject?, body, waLink?, aiUsed? }
// Registra il messaggio preparato/aperto, crea un'attivita nello storico e,
// se il lead era NUOVO, lo porta a CONTATTATO (approccio semi-automatico).
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "messages:write", 60, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => ({}));
  const leadId = asString(body?.leadId, 100);
  const channelRaw = asString(body?.channel, 20);
  const subject = asString(body?.subject, 500);
  const bodyText = asString(body?.body, 50000);
  const waLink = asString(body?.waLink, 1000);
  const aiUsed = asBoolean(body?.aiUsed) ?? false;
  const channel = channelRaw === "email" ? "email" : "whatsapp";
  if (!leadId)
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead)
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });

  const message = await prisma.generatedMessage.create({
    data: {
      leadId: lead.id,
      channel,
      subject,
      body: bodyText ?? "",
      waLink,
      aiUsed,
    },
  });

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: channel,
      description:
        channel === "whatsapp"
          ? "Messaggio WhatsApp preparato e aperto"
          : "Email preparata e aperta",
    },
  });

  if (lead.status === "NUOVO") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "CONTATTATO" },
    });
  }

  return NextResponse.json({ ok: true, message });
}
