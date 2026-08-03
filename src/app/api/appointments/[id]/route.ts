import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const rl = await rateLimitedResponse(req, "calendar:item", 80, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => null);
  const title = asString(body?.title, 300);
  const notes = asString(body?.notes, 5000);
  const leadId = asString(body?.leadId, 100);
  const startsAt = asString(body?.startsAt, 100);
  const done = body?.done !== undefined ? (asBoolean(body?.done) ?? false) : undefined;
  if (!body) return NextResponse.json({ error: "body mancante" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (title !== undefined && title !== null) data.title = title;
  if (notes !== undefined && notes !== null) data.notes = notes;
  if (leadId !== undefined) data.leadId = leadId || null;
  if (startsAt) data.startsAt = new Date(startsAt);
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (done !== undefined) data.done = done;
  const appointment = await prisma.appointment.update({ where: { id: context.params.id }, data });
  return NextResponse.json({ appointment });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const rl = await rateLimitedResponse(req, "calendar:item", 80, 60000);
  if (rl) return rl;
  await prisma.appointment.delete({ where: { id: context.params.id } });
  return NextResponse.json({ ok: true });
}
