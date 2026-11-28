import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse } from "@/lib/security";
import { eraseLeadData, isEraseConfirmationValid } from "@/lib/lead-privacy";
import { removeLeadScreenshot } from "@/lib/lead-files";

export const dynamic = "force-dynamic";

// POST /api/leads/[id]/erase
// Cancellazione completa dei dati del lead (diritto all'oblio).
//
// La conferma e' il nome esatto del lead, non un booleano: un click per
// sbaglio o un `{ confirm: true }` non devono poter distruggere una scheda.
// La risposta elenca le righe rimosse per tabella, cosi' chi chiama puo'
// verificare che Appointment ed EmailLog (le due relazioni SetNull) siano
// state svuotate davvero.
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "lead:erase", 10, 60_000);
  if (rl) return rl;

  const id = (await context.params).id;
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, name: true, websiteScreenshot: true },
  });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !isEraseConfirmationValid(lead.name, body.confirm)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Conferma non valida: invia { \"confirm\": \"<nome esatto del lead>\" }.",
      },
      { status: 400 },
    );
  }

  let deleted;
  try {
    deleted = await eraseLeadData(id);
  } catch {
    return NextResponse.json({ ok: false, error: "Cancellazione non riuscita" }, { status: 500 });
  }

  const screenshotRemoved = await removeLeadScreenshot(lead.websiteScreenshot);

  return NextResponse.json({ ok: true, deleted: { ...deleted, screenshot: screenshotRemoved ? 1 : 0 } });
}
