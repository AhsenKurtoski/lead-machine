import { NextRequest, NextResponse } from "next/server";
import { rateLimitedResponse } from "@/lib/security";
import { getLeadExport } from "@/lib/lead-privacy";

export const dynamic = "force-dynamic";

// GET /api/leads/[id]/export
// Esportazione dei dati personali del lead (diritto alla portabilita').
// Include tutto cio' che nel database riguarda quella persona, in JSON.
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "lead:export", 10, 60_000);
  if (rl) return rl;

  const id = (await context.params).id;
  const lead = await getLeadExport(id);
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  const body = {
    ok: true,
    format: "lead-machine-gdpr-export-v1",
    exportedAt: new Date().toISOString(),
    lead,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // I dati personali non devono restare in cache (browser, proxy, CDN).
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="lead-${id}-export.json"`,
    },
  });
}
