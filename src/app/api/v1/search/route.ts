import { NextResponse } from "next/server";
import { runOverpassSearch, type OsmCandidate } from "@/lib/overpass";
import { runGeoapifySearch, geoapifyEnabled } from "@/lib/geoapify";
import { scoreCandidate } from "@/lib/scoring";
import { getCategoryById } from "@/lib/categories";
import { validateApiKey, CORS_HEADERS, withTimeout, rateLimitApiKey, requireScope } from "@/lib/api-auth";
import { asString, asInt, asArray } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function normName(s: string | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function dedupKey(c: OsmCandidate): string {
  const la = Number.isFinite(c.lat) ? c.lat.toFixed(3) : "";
  const ln = Number.isFinite(c.lng) ? c.lng.toFixed(3) : "";
  return normName(c.name) + "@" + la + "," + ln;
}

// POST /api/v1/search -> Ricerca live attività su OpenStreetMap (+ Geoapify se configurato)
export async function POST(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: CORS_HEADERS });
  }
  const scope = requireScope(auth.apiKey.scopes, "search");
  if (!scope.ok) return scope.response;
  const limited = await rateLimitApiKey(auth.apiKey.id, "v1:search", 30, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const rawCategories = asArray(body.categories) || [];
    const categories: string[] = rawCategories
      .map((c: unknown) => asString(c, 100))
      .filter((c: string | null): c is string => Boolean(c && c.length > 0));

    const lat = Number(body.lat ?? process.env.NEXT_PUBLIC_SEARCH_LAT ?? "46.0172");
    const lng = Number(body.lng ?? process.env.NEXT_PUBLIC_SEARCH_LNG ?? "11.91");
    const radiusM = asInt(body.radius_m) ?? asInt(body.radius) ?? 5000;
    const searchCity = asString(body.searchCity, 200) || (process.env.NEXT_PUBLIC_SEARCH_CITY ?? "Feltre");
    const contactEmail = process.env.OSM_CONTACT_EMAIL ?? "api@leadmachine.local";
    // Budget di tempo: i mirror Overpass possono essere lenti o irraggiungibili.
    // Il client puo' abbassarlo, ma non alzarlo oltre 100s (limite della piattaforma).
    const budgetMs = Math.min(Math.max(asInt(body.timeoutMs) ?? 45_000, 5_000), 100_000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { ok: false, error: "Coordinate non valide: fornisci lat e lng numerici." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const warnings: string[] = [];
    let results: OsmCandidate[] = [];

    // 1) OpenStreetMap / Overpass (fonte sempre disponibile, gratuita)
    try {
      results = await withTimeout(
        runOverpassSearch(categories, lat, lng, radiusM, contactEmail),
        budgetMs,
        "OpenStreetMap"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push("OpenStreetMap non ha risposto: " + msg);
    }

    // 2) Geoapify (opzionale, solo se c'e' una chiave configurata)
    if (results.length === 0 && (await geoapifyEnabled())) {
      try {
        const geoResults = await withTimeout(
          runGeoapifySearch(categories, lat, lng, radiusM),
          Math.max(10_000, budgetMs),
          "Geoapify"
        );
        results = results.concat(geoResults);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        warnings.push("Geoapify non ha risposto: " + msg);
      }
    }

    // 3) Dedup (stesso nome + coordinate), categoria e scoring
    const seen = new Set<string>();
    const unique: OsmCandidate[] = [];
    for (const c of results) {
      const k = dedupKey(c);
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(c);
    }

    const leads = unique.map((cand) => {
      const cat = getCategoryById(cand.category);
      const scoring = scoreCandidate(cand);
      return {
        osmId: cand.osmId,
        name: cand.name,
        category: cand.category,
        categoryLabel: cat?.label ?? cand.categoryLabel,
        addressFull: cand.addressFull ?? null,
        city: cand.city ?? searchCity,
        postalCode: cand.postalCode ?? null,
        lat: cand.lat,
        lng: cand.lng,
        phone: cand.phone ?? null,
        whatsapp: cand.whatsapp ?? null,
        email: cand.email ?? null,
        website: cand.website ?? null,
        websiteStatus: scoring.websiteStatus,
        hasWebsite: cand.hasWebsite,
        hasSocial: cand.hasSocial,
        instagram: cand.instagram ?? null,
        facebook: cand.facebook ?? null,
        tiktok: cand.tiktok ?? null,
        priorityScore: scoring.score,
        priorityReason: scoring.reason,
      };
    });

    leads.sort((a, b) => b.priorityScore - a.priorityScore);

    return NextResponse.json(
      {
        ok: true,
        count: leads.length,
        area: { city: searchCity, lat, lng, radiusM },
        timedOut: warnings.some((w) => w.includes("tempo scaduto")),
        warnings,
        leads,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore durante la ricerca";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

