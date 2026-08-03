import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/followups -> elenco follow-up (filtri opzionali ?leadId= e ?pending=1)
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId");
  const pending = req.nextUrl.searchParams.get("pending");
  const where: Record<string, unknown> = {};
  if (leadId) where.leadId = leadId;
  if (pending === "1") where.done = false;
  const followUps = await prisma.followUp.findMany({
    where,
    orderBy: { dueDate: "asc" },
    include: { lead: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ followUps });
}

// POST /api/followups -> crea un promemoria di ricontatto
export async function POST(req: NextRequest) {
  const rl = await rateLimitedResponse(req, "calendar:write", 40, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => null);
  const title = asString(body?.title, 300);
  const notes = asString(body?.notes, 5000);
  const note = asString(body?.note, 5000);
  const leadId = asString(body?.leadId, 100);
  const channel = asString(body?.channel, 20);
  const dueDate = asString(body?.dueDate, 100);
  if (!body || !leadId || !dueDate) {
    return NextResponse.json({ error: "leadId e dueDate obbligatori" }, { status: 400 });
  }
  const due = new Date(dueDate);
  const followUp = await prisma.followUp.create({
    data: {
      leadId,
      dueDate: due,
      note: notes || note || null,
      channel: channel || null,
    },
  });
  await prisma.activity.create({
    data: {
      leadId,
      type: "sistema",
      description: "Follow-up programmato per il " + due.toLocaleString("it-IT"),
    },
  });
  await prisma.notification.create({
    data: {
      type: "follow_up",
      title: "Follow-up programmato",
      message: notes || note || null,
      link: "/crm/" + leadId,
    },
  });
  return NextResponse.json({ followUp });
}
