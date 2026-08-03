import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureWebsite } from "@/lib/screenshot";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "screenshot:capture", 15, 60000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const leadId = asString(body?.leadId, 100) || "";
  const url = asString(body?.url, 2000) || "";

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "leadId obbligatorio" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }
  if (!lead.website) {
    return NextResponse.json({ ok: false, error: "Questo lead non ha un sito web." }, { status: 400 });
  }

  const result = await captureWebsite(url || lead.website, leadId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.needsInstall ? 501 : 500 });
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { websiteScreenshot: result.publicPath },
  });
  await prisma.activity.create({
    data: { leadId, type: "sistema", description: "Screenshot del sito catturato" },
  });

  return NextResponse.json({ ok: true, screenshot: result.publicPath });
}
