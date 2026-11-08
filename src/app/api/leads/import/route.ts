import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString, asArray } from "@/lib/security";
import { STATUS_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TRUE_VALUES = ["true", "1", "si", "sì", "yes", "x", "vero"];
const ALLOWED_STATUSES = Object.keys(STATUS_LABELS);

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toCoord(v: unknown, min: number, max: number): number | null {
  const n = toNum(v);
  return n !== null && n >= min && n <= max ? n : null;
}

function toBool(v: unknown): boolean {
  return TRUE_VALUES.includes(String(v ?? "").trim().toLowerCase());
}

function normKey(name: string, city: string | null): string {
  return name.trim().toUpperCase() + "|" + (city ?? "").trim().toUpperCase();
}

// POST /api/leads/import  body: { rows: [{ name, category, ... }] }
// Crea i lead, saltando quelli senza nome o gia presenti (stesso nome + citta).
// La deduplica e' batchata e la scrittura e' atomica: un errore non lascia
// meta import nel database.
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "leads:import", 20, 60_000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const rawRows = asArray(body?.rows) ?? [];
  const rows: Array<Record<string, unknown>> = (Array.isArray(rawRows) ? rawRows : []).filter(
    (x): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x)
  );

  let skipped = 0;
  const prepared: Array<{
    name: string;
    city: string | null;
    category: string | null;
    subcategory: string | null;
    phone: string | null;
    mobile: string | null;
    whatsapp: string | null;
    email: string | null;
    hasWebsite: boolean;
    website: string | null;
    websiteStatus: string | null;
    hasSocial: boolean;
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    googleRating: number | null;
    googleReviews: number | null;
    addressFull: string | null;
    postalCode: string | null;
    lat: number | null;
    lng: number | null;
    priorityScore: number;
    priorityReason: string | null;
    status: string;
    notes: string | null;
  }> = [];

  for (const r of rows) {
    const name = (asString(r.name, 200) ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    const status = asString(r.status, 30) ?? "NUOVO";
    if (!ALLOWED_STATUSES.includes(status)) {
      skipped++;
      continue;
    }
    const rating = toNum(r.googleRating);
    const reviews = toNum(r.googleReviews);
    const score = toNum(r.priorityScore);
    prepared.push({
      name,
      city: (asString(r.city, 100) ?? "").trim() || null,
      category: asString(r.category, 200) ?? null,
      subcategory: asString(r.subcategory, 200) ?? null,
      phone: asString(r.phone, 50) ?? null,
      mobile: asString(r.mobile, 50) ?? null,
      whatsapp: asString(r.whatsapp, 50) ?? null,
      email: asString(r.email, 254) ?? null,
      hasWebsite: toBool(r.hasWebsite) || Boolean(r.website),
      website: asString(r.website, 2048) ?? null,
      websiteStatus: asString(r.websiteStatus, 50) ?? null,
      hasSocial: toBool(r.hasSocial) || Boolean(r.instagram || r.facebook || r.tiktok),
      instagram: asString(r.instagram, 200) ?? null,
      facebook: asString(r.facebook, 200) ?? null,
      tiktok: asString(r.tiktok, 200) ?? null,
      googleRating: rating !== null && rating >= 0 && rating <= 5 ? Math.round(rating * 10) / 10 : null,
      googleReviews: reviews !== null && reviews >= 0 ? Math.round(reviews) : null,
      addressFull: asString(r.addressFull, 500) ?? null,
      postalCode: asString(r.postalCode, 20) ?? null,
      lat: toCoord(r.lat, -90, 90),
      lng: toCoord(r.lng, -180, 180),
      priorityScore: score === null ? 0 : Math.max(0, Math.min(100, Math.round(score))),
      priorityReason: asString(r.priorityReason, 1000) ?? null,
      status,
      notes: asString(r.notes, 10000) ?? null,
    });
  }

  if (prepared.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skipped });
  }

  try {
    // Un'unica lettura per costruire l'insieme dei duplicati esistenti.
    const existingRows = await prisma.lead.findMany({ select: { name: true, city: true } });
    const existing = new Set(existingRows.map((row) => normKey(row.name, row.city)));

    let created = 0;
    // D1 has no interactive transactions. Build the whole batch first so all
    // rows (and their initial activity) are committed atomically.
    const creates: Array<ReturnType<typeof prisma.lead.create>> = [];
    for (const row of prepared) {
      const key = normKey(row.name, row.city);
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      creates.push(
        prisma.lead.create({
          data: {
            ...row,
            source: "import_csv",
            activities: {
              create: { type: "sistema", description: "Lead importato da CSV" },
            },
          },
        })
      );
      existing.add(key);
      created++;
    }
    if (creates.length > 0) await prisma.$transaction(creates);

    return NextResponse.json({ ok: true, created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore import";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
