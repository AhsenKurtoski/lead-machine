import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asBoolean } from "@/lib/security";

export const dynamic = "force-dynamic";

// PATCH /api/keys/[id] -> abilita/disabilita una chiave
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const enabled = asBoolean(body.enabled);
    if (enabled === null) {
      return NextResponse.json({ ok: false, error: "Stato non valido" }, { status: 400 });
    }

    const updated = await prisma.apiKey.update({
      where: { id: params.id },
      data: { enabled },
      select: { id: true, name: true, enabled: true },
    });

    return NextResponse.json({ ok: true, apiKey: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore aggiornamento chiave";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// DELETE /api/keys/[id] -> revoca/cancella definitivamente la chiave
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.apiKey.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore eliminazione chiave";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
