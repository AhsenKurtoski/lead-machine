import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, CORS_HEADERS, rateLimitApiKey } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/v1/leads/[id] -> Dettaglio completo con eventuale sito demo salvato
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: CORS_HEADERS });
  }
  const limited = await rateLimitApiKey(auth.apiKey.id, "v1:leads:read", 300, 60_000);
  if (limited) return limited;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        quotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json({ ok: true, lead }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore server";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
