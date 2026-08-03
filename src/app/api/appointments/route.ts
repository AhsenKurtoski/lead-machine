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
  const startsAt = asString(body?.startsAt, 100);
  if (!body || !title || !startsAt) {
    return NextResponse.json({ error: "title e startsAt obbligatori" }, { status: 400 });
  }
  const appointment = await prisma.appointment.create({
    data: {
      title,
      startsAt: new Date(startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
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
}
