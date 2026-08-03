import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await prisma.messageTemplate.findMany({
    orderBy: [{ channel: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "templates:write", 40, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => ({}));
  const name = asString(body?.name, 200);
  const channelRaw = asString(body?.channel, 20);
  const channelWhitelist = ["whatsapp", "email"];
  const channel = channelRaw && channelWhitelist.includes(channelRaw) ? channelRaw : null;
  const subject = asString(body?.subject, 500);
  const bodyText = asString(body?.body, 50000);
  const isDefault = asBoolean(body?.isDefault) ?? false;
  if (!name || !channel || !bodyText) {
    return NextResponse.json(
      { ok: false, error: "Nome, canale e testo sono obbligatori" },
      { status: 400 }
    );
  }
  const template = await prisma.messageTemplate.create({
    data: {
      name,
      channel,
      subject,
      body: bodyText,
      isDefault,
    },
  });
  return NextResponse.json({ ok: true, template });
}
