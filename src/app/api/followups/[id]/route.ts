import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const rl = await rateLimitedResponse(req, "calendar:item", 80, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => null);
  const notes = asString(body?.notes, 5000);
  const note = asString(body?.note, 5000);
  const leadId = asString(body?.leadId, 100);
  const channel = asString(body?.channel, 20);
  const dueDate = asString(body?.dueDate, 100);
  const done = body?.done !== undefined ? (asBoolean(body?.done) ?? false) : undefined;
  if (!body) return NextResponse.json({ error: "body mancante" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (notes !== undefined || note !== undefined) data.note = notes || note || null;
  if (leadId !== undefined) data.leadId = leadId;
  if (channel !== undefined) data.channel = channel || null;
  if (dueDate) data.dueDate = new Date(dueDate);
  if (done !== undefined) data.done = done;
  const followUp = await prisma.followUp.update({ where: { id: context.params.id }, data });
  return NextResponse.json({ followUp });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const rl = await rateLimitedResponse(req, "calendar:item", 80, 60000);
  if (rl) return rl;
  await prisma.followUp.delete({ where: { id: context.params.id } });
  return NextResponse.json({ ok: true });
}
