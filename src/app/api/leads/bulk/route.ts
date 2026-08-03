import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const dynamic = "force-dynamic";

// POST /api/leads/bulk
// body: { ids: string[], action: "delete" | "status", status?: string }
// Azioni massive sul CRM: elimina piu lead oppure cambia il loro stato.
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "leads:bulk", 15, 60_000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const rawIds = asArray(body?.ids) ?? [];
  const ids: string[] = rawIds
    .map((x: unknown) => asString(x, 100))
    .filter((x: string | null): x is string => typeof x === "string" && x.length > 0);
  const actionRaw = asString(body?.action, 20);
  const action = ["delete", "status"].includes(actionRaw ?? "") ? actionRaw : null;

  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "Nessun lead selezionato" }, { status: 400 });
  }

  if (action === "delete") {
    // La cancellazione propaga su attivita, follow-up, preventivi, ecc. (relazioni a cascata).
    const result = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  if (action === "status") {
    const status = asString(body?.status, 30) ?? "";
    if (!status) {
      return NextResponse.json({ ok: false, error: "Stato mancante" }, { status: 400 });
    }
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    // Registra il cambio di stato nel diario di ogni lead.
    for (const leadId of ids) {
      await prisma.activity.create({
        data: { leadId, type: "stato", description: "Stato cambiato in " + status },
      });
    }
    return NextResponse.json({ ok: true, updated: result.count });
  }

  return NextResponse.json({ ok: false, error: "Azione non valida" }, { status: 400 });
}
