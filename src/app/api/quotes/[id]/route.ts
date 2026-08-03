import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { id: context.params.id },
    include: { lead: true },
  });
  if (!quote) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  return NextResponse.json({ quote });
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const rl = await rateLimitedResponse(req, "quotes:item", 60, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => null);
  const title = asString(body?.title, 300);
  const statusRaw = asString(body?.status, 20);
  const statusWhitelist = ["bozza", "inviato", "accettato", "rifiutato"];
  const status = statusRaw && statusWhitelist.includes(statusRaw) ? statusRaw : undefined;
  const discount = body?.discount !== undefined ? (asNumber(body?.discount) ?? 0) : undefined;
  const taxRate = body?.taxRate !== undefined ? (asNumber(body?.taxRate) ?? 0) : undefined;
  const notes = asString(body?.notes, 5000);
  if (!body) return NextResponse.json({ error: "body mancante" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (title !== undefined && title !== null) data.title = title;
  if (notes !== undefined && notes !== null) data.notes = notes;
  if (typeof body.paymentTerms === "string") data.paymentTerms = body.paymentTerms;
  if (typeof body.deliveryTime === "string") data.deliveryTime = body.deliveryTime;
  if (Array.isArray(body.items)) data.items = JSON.stringify(body.items);
  if (discount !== undefined) data.discount = discount;
  if (taxRate !== undefined) data.taxRate = taxRate;
  if (body.depositPercent !== undefined) data.depositPercent = Number(body.depositPercent) || 0;
  if (body.validUntil !== undefined) {
    data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
  }
  const quote = await prisma.quote.update({ where: { id: context.params.id }, data });
  return NextResponse.json({ quote });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const rl = await rateLimitedResponse(req, "quotes:item", 60, 60000);
  if (rl) return rl;
  await prisma.quote.delete({ where: { id: context.params.id } });
  return NextResponse.json({ ok: true });
}
