import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asBoolean, asString } from "@/lib/security";
import { parseScopes, serializeScopes } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// PATCH /api/keys/[id] -> aggiorna stato (enabled) e/o permessi (scopes)
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json().catch(() => ({}));
    const data: { enabled?: boolean; permissions?: string; name?: string } = {};

    if (body.enabled !== undefined) {
      const enabled = asBoolean(body.enabled);
      if (enabled === null) {
        return NextResponse.json({ ok: false, error: "Stato non valido" }, { status: 400 });
      }
      data.enabled = enabled;
    }

    if (body.permissions !== undefined) {
      const requested = asString(body.permissions, 100)?.trim() ?? "";
      const scopes = parseScopes(requested);
      if (scopes.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Nessun permesso valido. Valori ammessi: read, write, search, ai." },
          { status: 400 }
        );
      }
      data.permissions = serializeScopes(scopes);
    }

    if (body.name !== undefined) {
      const name = asString(body.name, 100)?.trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: "Nome non valido" }, { status: 400 });
      }
      data.name = name;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    // 404 pulito se la chiave non esiste, invece di un 500 da Prisma.
    const existing = await prisma.apiKey.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Chiave API non trovata" }, { status: 404 });
    }

    const updated = await prisma.apiKey.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, keyPrefix: true, permissions: true, enabled: true },
    });

    return NextResponse.json({ ok: true, apiKey: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore aggiornamento chiave";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// DELETE /api/keys/[id] -> revoca/cancella definitivamente la chiave
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const existing = await prisma.apiKey.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Chiave API non trovata" }, { status: 404 });
    }
    await prisma.apiKey.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore eliminazione chiave";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
