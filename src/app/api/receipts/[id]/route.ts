import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString, asNumber } from "@/lib/security";
import { normalizeMethod, parseAmount } from "@/lib/receipts";

// GET /api/receipts/[id]
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { lead: { select: { id: true, name: true, email: true, phone: true } } },
  });
  if (!receipt) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true, receipt });
}

// PATCH /api/receipts/[id] -> corregge i dati della ricevuta (importo, metodo, data, note)
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "receipts:item", 60, 60000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body mancante" }, { status: 400 });

  const id = (await context.params).id;
  const data: Record<string, unknown> = {};

  if (body.description !== undefined) {
    data.description = asString(body.description, 300) || null;
  }
  if (body.notes !== undefined) {
    data.notes = asString(body.notes, 5000) || null;
  }
  if (body.amount !== undefined) {
    data.amount = parseAmount(asNumber(body.amount, 0, 1_000_000) ?? body.amount);
  }
  if (body.method !== undefined) {
    data.method = normalizeMethod(body.method);
  }
  if (body.paidAt !== undefined) {
    const raw = asString(body.paidAt, 40);
    const d = raw ? new Date(raw) : new Date();
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "data di pagamento non valida" }, { status: 400 });
    }
    data.paidAt = d;
  }

  const receipt = await prisma.receipt.update({ where: { id }, data });
  return NextResponse.json({ ok: true, receipt });
}

// DELETE /api/receipts/[id]
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "receipts:item", 60, 60000);
  if (rl) return rl;
  const id = (await context.params).id;
  await prisma.receipt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
