import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString, asNumber } from "@/lib/security";
import { generateReceiptNumber, normalizeMethod, parseAmount } from "@/lib/receipts";

// GET /api/receipts -> elenco ricevute di pagamento (filtro opzionale ?leadId=)
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId");
  const receipts = await prisma.receipt.findMany({
    where: leadId ? { leadId } : undefined,
    orderBy: { paidAt: "desc" },
    include: { lead: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ receipts });
}

// POST /api/receipts -> registra una ricevuta di pagamento
export async function POST(req: NextRequest) {
  const rl = await rateLimitedResponse(req, "receipts:write", 40, 60000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const leadId = asString(body?.leadId, 100);
  const description = asString(body?.description, 300);
  const notes = asString(body?.notes, 5000);
  const amountRaw = asNumber(body?.amount, 0.01, 1_000_000);
  if (amountRaw === null) {
    return NextResponse.json({ error: "importo non valido" }, { status: 400 });
  }
  const amount = parseAmount(amountRaw);
  const method = normalizeMethod(body?.method);
  const paidAtRaw = asString(body?.paidAt, 40);
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

  if (!body || !leadId) {
    return NextResponse.json({ error: "leadId mancante" }, { status: 400 });
  }
  if (isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: "data di pagamento non valida" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) {
    return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  }

  // Numero progressivo per anno. D1 non supporta transazioni interattive:
  // leggiamo l'ultimo numero, poi creiamo ricevuta e attivita in un'unica
  // transazione batch. Il vincolo @unique su Receipt.number resta la garanzia
  // finale: se due richieste concorrenti scelgono lo stesso numero, una
  // fallisce con P2002 e riprova.
  let receipt: Awaited<ReturnType<typeof prisma.receipt.create>> | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const prefix = "RICEVUTA-" + new Date().getFullYear() + "-";
      const last = await prisma.receipt.findFirst({
        where: { number: { startsWith: prefix } },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const lastSeq = last ? Number(last.number.slice(prefix.length)) : 0;
      const number = generateReceiptNumber((Number.isFinite(lastSeq) ? lastSeq : 0) + 1);

      const [created] = await prisma.$transaction([
        prisma.receipt.create({
          data: {
            leadId,
            number,
            description: description || null,
            amount,
            method,
            paidAt,
            notes: notes || null,
          },
        }),
        prisma.activity.create({
          data: {
            leadId,
            type: "sistema",
            description: "Ricevuta di pagamento " + number + " registrata",
          },
        }),
      ]);
      receipt = created;
      break;
    } catch (e) {
      const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : null;
      if (code === "P2002" && attempt < 2) continue;
      return NextResponse.json({ error: "Creazione ricevuta non riuscita" }, { status: 500 });
    }
  }

  if (!receipt) {
    return NextResponse.json({ error: "Creazione ricevuta non riuscita" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, receipt }, { status: 201 });
}
