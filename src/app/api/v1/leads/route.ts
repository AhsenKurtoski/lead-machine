import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, CORS_HEADERS, rateLimitApiKey, requireScope } from "@/lib/api-auth";
import {
  asString,
  asNumber,
  asBoolean,
  asArray,
  asNonEmptyString,
  sanitizePlainText,
} from "@/lib/security";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/v1/leads -> Recupera lead con filtri per attività (senza sito, per città, per categoria, ecc.)
export async function GET(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: CORS_HEADERS });
  }
  const scope = requireScope(auth.apiKey.scopes, "read");
  if (!scope.ok) return scope.response;
  const limited = await rateLimitApiKey(auth.apiKey.id, "v1:leads:read", 300, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  const city = url.searchParams.get("city")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const onlyNoWeb = url.searchParams.get("onlyNoWeb") === "1" || url.searchParams.get("hasWebsite") === "false";
  const onlyWithWeb = url.searchParams.get("hasWebsite") === "true";
  const minScore = Number(url.searchParams.get("minScore") || 0);
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit") || 100)), 500);
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  const where: Record<string, unknown> = {};

  if (city) {
    where.city = { contains: city };
  }
  if (category) {
    where.category = category;
  }
  if (status) {
    where.status = status;
  }
  if (onlyNoWeb) {
    where.hasWebsite = false;
  } else if (onlyWithWeb) {
    where.hasWebsite = true;
  }
  if (minScore > 0) {
    where.priorityScore = { gte: minScore };
  }

  try {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { priorityScore: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          category: true,
          subcategory: true,
          phone: true,
          mobile: true,
          whatsapp: true,
          email: true,
          hasWebsite: true,
          website: true,
          websiteStatus: true,
          hasSocial: true,
          instagram: true,
          facebook: true,
          googleRating: true,
          googleReviews: true,
          addressFull: true,
          city: true,
          postalCode: true,
          lat: true,
          lng: true,
          priorityScore: true,
          priorityReason: true,
          status: true,
          notes: true,
          demoHtml: false, // Ometti il codice HTML pesante nella lista
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        total,
        limit,
        offset,
        leads,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore server";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

// POST /api/v1/leads -> Permette a un client esterno di inserire un lead
export async function POST(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: CORS_HEADERS });
  }
  const scope = requireScope(auth.apiKey.scopes, "write");
  if (!scope.ok) return scope.response;
  const limited = await rateLimitApiKey(auth.apiKey.id, "v1:leads:write", 60, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const name = asNonEmptyString(body.name, 200);
    if (!name) {
      return NextResponse.json({ ok: false, error: "Il nome dell'attività è obbligatorio" }, { status: 400, headers: CORS_HEADERS });
    }

    const city = asString(body.city, 100) || "Feltre";
    const lead = await prisma.lead.create({
      data: {
        name,
        category: asString(body.category, 100),
        subcategory: asString(body.subcategory, 150),
        phone: asString(body.phone, 50),
        whatsapp: asString(body.whatsapp, 50),
        email: asString(body.email, 254),
        hasWebsite: asBoolean(body.hasWebsite) ?? Boolean(body.website),
        website: asString(body.website, 2048),
        websiteStatus: asString(body.websiteStatus, 40) ?? (body.website ? "ok" : "assente"),
        addressFull: asString(body.addressFull, 500),
        city,
        postalCode: asString(body.postalCode, 20),
        lat: asNumber(body.lat, -90, 90),
        lng: asNumber(body.lng, -180, 180),
        priorityScore: asNumber(body.priorityScore, 0, 100) ?? 50,
        priorityReason: sanitizePlainText(body.priorityReason, 1000),
        source: asString(body.source, 50) || "api_external",
        status: asString(body.status, 50) || "NUOVO",
        activities: {
          create: {
            type: "sistema",
            description: `Lead creato tramite API Key (${auth.apiKey.name})`,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, lead }, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore creazione lead";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
