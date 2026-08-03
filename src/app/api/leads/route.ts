import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  rateLimitedResponse,
  asArray,
  asNonEmptyString,
  asBoolean,
  asNumber,
  asString,
  sanitizePlainText,
} from "@/lib/security";

export const dynamic = "force-dynamic";

type LeadCandidate = {
  name: string;
  category: string | null;
  categoryLabel: string | null;
  addressFull: string | null;
  city: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  hasWebsite: boolean;
  website: string | null;
  websiteStatus: string | null;
  hasSocial: boolean;
  instagram: string | null;
  facebook: string | null;
  priorityScore: number;
  priorityReason: string | null;
  source: string;
  osmId: string | null;
};

// GET /api/leads -> elenco lead (per CRM/dashboard)
export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { priorityScore: "desc" },
    include: { tags: true },
    take: 2000,
  });
  return NextResponse.json({ ok: true, leads });
}

// POST /api/leads
// body: { candidates: [...] }  -> salva i lead selezionati con dedup su osmId
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "leads:create", 30, 60_000);
  if (rl) return rl;

  try {
    const body = await req.json().catch(() => ({}));
    const rawCandidates = asArray(body.candidates, 500) || [];

    const raw = rawCandidates.map((c: unknown) => {
      const obj = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
      const name = asNonEmptyString(obj.name, 200);
      if (!name) return null;
      return {
        name,
        category: asString(obj.category, 100) ?? null,
        categoryLabel: asString(obj.categoryLabel, 150) ?? asString(obj.subcategory, 150) ?? null,
        addressFull: asString(obj.addressFull, 500) ?? null,
        city: asString(obj.city, 100) ?? null,
        postalCode: asString(obj.postalCode, 20) ?? null,
        lat: asNumber(obj.lat, -90, 90) ?? null,
        lng: asNumber(obj.lng, -180, 180) ?? null,
        phone: asString(obj.phone, 50) ?? null,
        whatsapp: asString(obj.whatsapp, 50) ?? null,
        email: asString(obj.email, 254) ?? null,
        hasWebsite: asBoolean(obj.hasWebsite) ?? Boolean(obj.website),
        website: asString(obj.website, 2048) ?? null,
        websiteStatus: asString(obj.websiteStatus, 40) ?? null,
        hasSocial: asBoolean(obj.hasSocial) ?? Boolean(obj.instagram || obj.facebook || obj.tiktok),
        instagram: asString(obj.instagram, 255) ?? null,
        facebook: asString(obj.facebook, 255) ?? null,
        priorityScore: asNumber(obj.priorityScore, 0, 100) ?? 0,
        priorityReason: sanitizePlainText(obj.priorityReason, 1000) || null,
        source: asString(obj.source, 40) || "overpass",
        osmId: asString(obj.osmId, 80) ?? null,
      } satisfies LeadCandidate;
    });

    const candidates = raw.filter((c): c is LeadCandidate => c !== null);

    if (!candidates.length) {
      return NextResponse.json({ ok: true, saved: 0, skipped: 0 });
    }

    // Dedup step 1: rimuove duplicati interni sulla base di osmId o nome+città
    const seen = new Set<string>();
    const uniq: LeadCandidate[] = [];
    for (const c of candidates) {
      const k = c.osmId ? `o:${c.osmId}` : `nc:${c.name.toUpperCase()}|${(c.city || "").toUpperCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(c);
    }

    // Dedup step 2: batch query dei duplicati già presenti
    const osmIds = uniq.map((c) => c.osmId).filter((x): x is string => Boolean(x));
    const existingByOsm = new Set<string>();
    if (osmIds.length) {
      const rows = await prisma.lead.findMany({
        where: { osmId: { in: osmIds } },
        select: { osmId: true },
      });
      for (const r of rows) if (r.osmId) existingByOsm.add(r.osmId);
    }

    // Dedup step 3: nome+città
    const nameCityKeys = uniq
      .filter((c) => !c.osmId || !existingByOsm.has(c.osmId))
      .map((c) => ({ c, k: `${c.name.toUpperCase()}|${(c.city || "").toUpperCase()}` }));
    const existingByName = new Set<string>();
    if (nameCityKeys.length) {
      // Batch OR query (max 100 per query per sicurezza SQLite)
      for (let i = 0; i < nameCityKeys.length; i += 100) {
        const chunk = nameCityKeys.slice(i, i + 100);
        const filters = chunk.map(({ c }) => ({
          name: c.name,
          city: c.city ?? undefined,
        }));
        const rows = await prisma.lead.findMany({
          where: { OR: filters },
          select: { name: true, city: true },
        });
        for (const r of rows) {
          existingByName.add(`${r.name.toUpperCase()}|${(r.city || "").toUpperCase()}`);
        }
      }
    }

    let saved = 0;
    let skipped = 0;

    // Transazione: salva in blocco i nuovi lead + notifiche
    for (const c of uniq) {
      if (c.osmId && existingByOsm.has(c.osmId)) {
        skipped++;
        continue;
      }
      const nameCity = `${c.name.toUpperCase()}|${(c.city || "").toUpperCase()}`;
      if (existingByName.has(nameCity)) {
        skipped++;
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          const defaultsCity = c.city ||
            (typeof process.env.NEXT_PUBLIC_SEARCH_CITY === "string" && process.env.NEXT_PUBLIC_SEARCH_CITY) ||
            "Feltre";
          const lead = await tx.lead.create({
            data: {
              name: c.name,
              category: c.category,
              subcategory: c.categoryLabel,
              addressFull: c.addressFull,
              city: defaultsCity,
              postalCode: c.postalCode,
              lat: c.lat,
              lng: c.lng,
              phone: c.phone,
              whatsapp: c.whatsapp,
              email: c.email,
              hasWebsite: Boolean(c.hasWebsite),
              website: c.website,
              websiteStatus: c.websiteStatus ?? (c.hasWebsite ? "da_verificare" : "assente"),
              hasSocial: Boolean(c.hasSocial),
              instagram: c.instagram,
              facebook: c.facebook,
              priorityScore: c.priorityScore,
              priorityReason: c.priorityReason,
              status: "NUOVO",
              source: c.source,
              osmId: c.osmId,
              activities: {
                create: { type: "sistema", description: "Lead importato da ricerca OpenStreetMap" },
              },
            },
          });
          await tx.notification.create({
            data: {
              type: "nuovo_lead",
              title: `Nuovo lead: ${lead.name}`,
              message: `${lead.subcategory ?? ""} - priorita ${lead.priorityScore}`,
              link: "/crm",
            },
          });
          saved++;
          if (c.osmId) existingByOsm.add(c.osmId);
          existingByName.add(nameCity);
        });
      } catch {
        // Duplicato da race condition o errore: skip per non rompere tutto.
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, saved, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
