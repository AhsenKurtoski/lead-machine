import { NextRequest, NextResponse } from "next/server";
import { rateLimitedResponse, asArray, asString } from "@/lib/security";
import { verifyLeads } from "@/lib/verify-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/leads/verify -> verifica piu lead in blocco (max 20 per chiamata)
export async function POST(req: NextRequest) {
  const rl = await rateLimitedResponse(req, "leads:verify:bulk", 6, 60000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const raw = asArray(body?.leadIds, 200);
  const leadIds = (raw ?? [])
    .map((v) => asString(v, 100))
    .filter((v): v is string => Boolean(v && v.trim()));

  if (leadIds.length === 0) {
    return NextResponse.json({ ok: false, error: "Nessun lead da verificare" }, { status: 400 });
  }

  try {
    const out = await verifyLeads(leadIds, 20);
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore server";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
