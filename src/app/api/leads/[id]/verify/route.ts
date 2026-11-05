import { NextRequest, NextResponse } from "next/server";
import { rateLimitedResponse } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { verifyLead } from "@/lib/verify-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/leads/[id]/verify -> esegue una verifica REALE dei dati
// (record MX del dominio email + risposta HTTP del sito) e salva l'esito.
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "leads:verify", 60, 60000);
  if (rl) return rl;

  const id = (await context.params).id;
  const exists = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  try {
    const outcome = await verifyLead(id);
    if (!outcome) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...outcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore server";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
