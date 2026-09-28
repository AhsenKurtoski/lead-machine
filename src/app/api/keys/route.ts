import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRawApiKey, parseScopes, serializeScopes } from "@/lib/api-auth";
import { asString, rateLimitedResponse } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET /api/keys -> Elenco chiavi API registrate (sicuro: mai l'hash o la chiave completa)
export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        enabled: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, keys });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/keys -> Genera una nuova API Key (restituisce la chiave raw UNA SOLA VOLTA)
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "keys:create", 10, 60_000);
  if (rl) return rl;

  try {
    const body = await req.json().catch(() => ({}));
    const name = asString(body.name, 100)?.trim() || "Nuova Integrazione";
    // Gli scope vengono validati: valori sconosciuti sono ignorati.
    // Profilo predefinito = accesso completo (nessuna restrizione a sorpresa).
    const requested = asString(body.permissions, 100)?.trim();
    const scopes = requested ? parseScopes(requested) : parseScopes("*");
    if (scopes.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nessun permesso valido richiesto. Valori ammessi: read, write, search, ai." },
        { status: 400 }
      );
    }

    const { rawKey, keyPrefix, keyHash } = generateRawApiKey();

    const created = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        permissions: serializeScopes(scopes),
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        enabled: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      apiKey: created,
      rawKey, // Da salvare subito, non sara mai piu mostrata
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore creazione chiave";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
