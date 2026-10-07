import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "templates:item", 80, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => ({}));
  const name = asString(body?.name, 200);
  const channelRaw = asString(body?.channel, 20);
  const channelWhitelist = ["whatsapp", "email"];
  const channel = channelRaw && channelWhitelist.includes(channelRaw) ? channelRaw : undefined;
  const subject = asString(body?.subject, 500);
  const bodyText = asString(body?.body, 50000);
  const isDefault = body?.isDefault !== undefined ? (asBoolean(body?.isDefault) ?? false) : undefined;
  const data: any = {};
  if (name !== undefined && name !== null) data.name = name;
  if (channel !== undefined) data.channel = channel;
  if (subject !== undefined) data.subject = subject;
  if (bodyText !== undefined && bodyText !== null) data.body = bodyText;
  if (isDefault !== undefined) data.isDefault = isDefault;
  const template = await prisma.messageTemplate.update({
    where: { id: (await context.params).id },
    data,
  });
  return NextResponse.json({ ok: true, template });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "templates:item", 80, 60000);
  if (rl) return rl;
  await prisma.messageTemplate.delete({ where: { id: (await context.params).id } });
  return NextResponse.json({ ok: true });
}
