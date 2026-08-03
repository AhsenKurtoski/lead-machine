import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQuoteNumber } from "@/lib/quotes";

// GET /api/quotes -> elenco preventivi (filtro opzionale ?leadId=)
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId");
  const quotes = await prisma.quote.findMany({
    where: leadId ? { leadId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { lead: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ quotes });
}

// POST /api/quotes -> crea un nuovo preventivo
export async function POST(req: NextRequest) {
  const rl = await rateLimitedResponse(req, "quotes:write", 30, 60000);
  if (rl) return rl;
  const body = await req.json().catch(() => null);
  const leadId = asString(body?.leadId, 100);
  const title = asString(body?.title, 300);
  const discount = asNumber(body?.discount, 0, 100) ?? 0;
  const taxRate = asNumber(body?.taxRate) ?? 0;
  const notes = asString(body?.notes, 5000);
  const statusRaw = asString(body?.status, 20);
  const statusWhitelist = ["bozza", "inviato", "accettato", "rifiutato"];
  const status = statusRaw && statusWhitelist.includes(statusRaw) ? statusRaw : "bozza";
  if (!body || !leadId) {
    return NextResponse.json({ error: "leadId mancante" }, { status: 400 });
  }
  const count = await prisma.quote.count();
  const number = generateQuoteNumber(count + 1);
  const items = Array.isArray(body.items) ? body.items : [];
  const quote = await prisma.quote.create({
    data: {
      leadId,
      number,
      title,
      items: JSON.stringify(items),
      notes,
      discount,
      taxRate,
      depositPercent: Number(body.depositPercent) || 0,
      paymentTerms: body.paymentTerms ?? null,
      deliveryTime: body.deliveryTime ?? null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      status,
    },
  });
  await prisma.activity.create({
    data: {
      leadId,
      type: "sistema",
      description: "Preventivo " + number + " creato",
    },
  });
  return NextResponse.json({ quote });
}
