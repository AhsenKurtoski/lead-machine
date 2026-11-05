import { NextRequest, NextResponse } from "next/server";
import { rateLimitedResponse, asInt } from "@/lib/security";
import { getRetryQueue, runDueVerifications, RETRY_SWEEP_MAX_LEADS } from "@/lib/verify-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/leads/verify/retry -> i controlli in coda (quelli che non si sono
// potuti fare per un problema di rete e verranno riprovati), con la data del
// prossimo tentativo e quanti ne sono gia' stati fatti.
export async function GET(req: NextRequest) {
  const limit = asInt(new URL(req.url).searchParams.get("limit"), 1, 200) ?? 50;
  try {
    const queue = await getRetryQueue(limit);
    return NextResponse.json({
      ok: true,
      count: queue.length,
      due: queue.filter((q) => q.due).length,
      queue,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore server";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/leads/verify/retry -> riprova i controlli scaduti (max 5 lead per
// chiamata). Lo chiama l'app da sola quando si apre, cosi' un controllo
// rinviato per un errore di rete non resta fermo su "da verificare".
export async function POST(req: NextRequest) {
  const rl = await rateLimitedResponse(req, "leads:verify:retry", 6, 60_000);
  if (rl) return rl;

  try {
    const out = await runDueVerifications(RETRY_SWEEP_MAX_LEADS);
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore server";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
