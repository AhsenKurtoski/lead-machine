import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString, asArray } from "@/lib/security";
import { STATUS_LABELS } from "@/lib/utils";

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
    // La cancellazione propaga su attivita, follow-up, ricevute, ecc. (relazioni a cascata).
    const result = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  if (action === "status") {
    const status = asString(body?.status, 30) ?? "";
    if (!status || !Object.keys(STATUS_LABELS).includes(status)) {
      return NextResponse.json({ ok: false, error: "Stato non valido" }, { status: 400 });
    }

    // Considera solo ID esistenti: evita FK fallite nel diario.
    const existing = await prisma.lead.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const validIds = existing.map((row) => row.id);
    if (validIds.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const [result] = await prisma.$transaction([
      prisma.lead.updateMany({
        where: { id: { in: validIds } },
        data: { status },
      }),
      prisma.activity.createMany({
        data: validIds.map((leadId) => ({
          leadId,
          type: "stato",
          description: "Stato cambiato in " + status,
        })),
      }),
    ]);
    return NextResponse.json({ ok: true, updated: result.count });
  }

  return NextResponse.json({ ok: false, error: "Azione non valida" }, { status: 400 });
}
