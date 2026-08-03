import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const dynamic = "force-dynamic";

const TRUE_VALUES = ["true", "1", "si", "s\u00ec", "yes", "x", "vero"];

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown): boolean {
  return TRUE_VALUES.includes(String(v ?? "").trim().toLowerCase());
}

// POST /api/leads/import  body: { rows: [{ name, category, ... }] }
// Crea i lead, saltando quelli senza nome o gia presenti (stesso nome + citta).
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "leads:import", 20, 60_000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const rawRows = asArray(body?.rows) ?? [];
  const rows: Array<Record<string, unknown>> = (Array.isArray(rawRows) ? rawRows : []).filter(
    (x): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x)
  );
  let created = 0;
  let skipped = 0;

  for (const r of rows) {
    const name = (asString(r.name, 200) ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    const city = (asString(r.city, 100) ?? "").trim() || "Feltre";
    const category = asString(r.category, 200) ?? null;
    const existing = await prisma.lead.findFirst({ where: { name, city } });
    if (existing) {
      skipped++;
      continue;
    }
    const reviews = toNum(r.googleReviews);
    const score = toNum(r.priorityScore);
    await prisma.lead.create({
      data: {
        name,
        category,
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
        googleRating: toNum(r.googleRating),
        googleReviews: reviews === null ? null : Math.round(reviews),
        addressFull: asString(r.addressFull, 500) ?? null,
        city,
        postalCode: asString(r.postalCode, 20) ?? null,
        lat: toNum(r.lat),
        lng: toNum(r.lng),
        priorityScore: score === null ? 0 : Math.round(score),
        priorityReason: asString(r.priorityReason, 1000) ?? null,
        status: asString(r.status, 30) ?? "NUOVO",
        notes: asString(r.notes, 10000) ?? null,
        source: "import_csv",
        activities: {
          create: { type: "sistema", description: "Lead importato da CSV" },
        },
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created, skipped });
}
