import { NextRequest, NextResponse } from "next/server";
import { getStoredVerification } from "@/lib/verify-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/leads/[id]/verification -> ultima verifica salvata per il lead
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  try {
    const outcome = await getStoredVerification(id);
    return NextResponse.json({ ok: true, ...outcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore server";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
