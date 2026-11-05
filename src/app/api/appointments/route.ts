import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/appointments -> elenco appuntamenti in ordine cronologico
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId");
  const appointments = await prisma.appointment.findMany({
    where: leadId ? { leadId } : undefined,
    orderBy: { startsAt: "asc" },
    include: { lead: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ appointments });
}

// POST /api/appointments -> crea un appuntamento (lead opzionale)
export async function POST(req: NextRequest) {
  const rl = await rateLimitedResponse(req, "calendar:write", 40, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => null);
  const title = asString(body?.title, 300);
  const notes = asString(body?.notes, 5000);
  const leadId = asString(body?.leadId, 100);
  const channel = asString(body?.channel, 20);
  const startsAtRaw = asString(body?.startsAt, 100);
  const endsAtRaw = asString(body?.endsAt, 100);
  if (!body || !title || !startsAtRaw) {
    return NextResponse.json({ error: "title e startsAt obbligatori" }, { status: 400 });
  }

  const startsAt = new Date(startsAtRaw);
  if (isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "data di inizio non valida" }, { status: 400 });
  }
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  if (endsAt && isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "data di fine non valida" }, { status: 400 });
  }
  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    return NextResponse.json({ error: "la fine non puo precedere l'inizio" }, { status: 400 });
  }
  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        title,
        startsAt,
        endsAt,
        notes,
        leadId: leadId || null,
      },
    });
    if (leadId) {
      await prisma.activity.create({
        data: {
          leadId,
          type: "sistema",
          description: "Appuntamento programmato: " + title,
        },
      });
    }
    return NextResponse.json({ appointment });
  } catch {
    return NextResponse.json({ error: "Creazione appuntamento non riuscita" }, { status: 400 });
  }
}
