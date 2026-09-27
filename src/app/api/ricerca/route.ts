import { NextResponse } from "next/server";
import { runOverpassSearch, type OsmCandidate } from "@/lib/overpass";
import { runGeoapifySearch, geoapifyEnabled } from "@/lib/geoapify";
import { runAiFinderSearch } from "@/lib/ai-finder";
import { getCategoryById } from "@/lib/categories";
import { scoreCandidate } from "@/lib/scoring";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";
import { withTimeout } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "ricerca:run", 15, 60000);
  if (rl) return rl;

  const body = await req.json().catch(() => ({}));
  const rawCategories = asArray(body.categories) || [];
  const categories: string[] = rawCategories
    .map((c: unknown) => asString(c, 100))
    .filter((c: string | null): c is string => Boolean(c && c.length > 0));

  const useAi: boolean = asBoolean(body.useAi) ?? true;

  const lat = Number(process.env.NEXT_PUBLIC_SEARCH_LAT ?? "46.0172");
  const lng = Number(process.env.NEXT_PUBLIC_SEARCH_LNG ?? "11.91");
  const radiusM = asInt(body.radius_m) ?? asInt(body.radius) ?? Number(process.env.NEXT_PUBLIC_SEARCH_RADIUS_M ?? "5000");
  const radius = Number.isFinite(radiusM) ? radiusM : Number(process.env.NEXT_PUBLIC_SEARCH_RADIUS_M ?? "5000");
  const searchCity = asString(body.searchCity, 200) || (process.env.NEXT_PUBLIC_SEARCH_CITY ?? "Feltre");
  const geoapifyMode = asString(body.geoapifyMode, 10) || "";
  const cityName = process.env.NEXT_PUBLIC_SEARCH_CITY ?? "Feltre";
  const contactEmail = process.env.OSM_CONTACT_EMAIL ?? "anonimo@example.com";

  type Center = { lat: number; lng: number; city?: string };
  const rawCenters = asArray(body.centers) || [];
  const centers: Center[] = [];
  for (const c of rawCenters as unknown[]) {
    if (c && typeof c === "object") {
      const cc = c as Record<string, unknown>;
      const cLat = Number(cc.lat);
      const cLng = Number(cc.lng);
      if (Number.isFinite(cLat) && Number.isFinite(cLng)) {
        centers.push({ lat: cLat, lng: cLng, city: typeof cc.city === "string" ? cc.city : undefined });
      }
    }
  }
  if (centers.length === 0) centers.push({ lat, lng, city: cityName });

  const warnings: string[] = [];

  // Budget globale di tempo: i mirror Overpass e i provider AI possono essere
  // lenti o irraggiungibili. Smettiamo di interrogare nuove fonti quando il tempo
  // e scaduto, cosi la ricerca risponde comunque con quello che e' riuscito a trovare.
  const START = Date.now();
  const BUDGET_MS = 100_000;
  const remaining = () => BUDGET_MS - (Date.now() - START);
  const budgetLeft = () => Math.min(Math.max(remaining() - 5_000, 5_000), 60_000);

  let osm: OsmCandidate[] = [];
  let osmOk = false;
  for (const center of centers) {
    if (remaining() <= 0) {
      warnings.push("Tempo di ricerca esaurito: alcune zone non sono state interrogate.");
      break;
    }
    try {
      const part = await withTimeout(
        runOverpassSearch(categories, center.lat, center.lng, radius, contactEmail),
        budgetLeft(),
        "OpenStreetMap"
      );
      osm = osm.concat(part);
      osmOk = true;
    } catch (err) {
      warnings.push("OpenStreetMap (" + (center.city ?? "zona") + "): " + (err instanceof Error ? err.message : "errore"));
    }
  }

  const geoEnabled = await geoapifyEnabled();
  let geo: OsmCandidate[] = [];
  if (geoEnabled) {
    for (const center of centers) {
      if (remaining() <= 0) {
        warnings.push("Tempo di ricerca esaurito: Geoapify non e' stato interrogato.");
        break;
      }
      try {
        const part = await withTimeout(
          runGeoapifySearch(categories, center.lat, center.lng, radius),
          budgetLeft(),
          "Geoapify"
        );
        geo = geo.concat(part);
      } catch (err) {
        warnings.push("Geoapify (" + (center.city ?? "zona") + "): " + (err instanceof Error ? err.message : "errore"));
      }
    }
  }

  let ai: OsmCandidate[] = [];
  let aiUsed = false;
  if (useAi && remaining() > 0) {
    try {
      const labels = categories
        .map((id) => getCategoryById(id)?.label)
        .filter((l): l is string => Boolean(l));
      const aiCity = centers.length > 1 ? "provincia di Belluno" : (centers[0].city ?? cityName);
      const res = await withTimeout(
        runAiFinderSearch(labels, centers[0].lat, centers[0].lng, radius, aiCity),
        budgetLeft(),
        "AI"
      );
      ai = res.candidates;
      aiUsed = res.used;
    } catch (err) {
      warnings.push("AI (Gemini): " + (err instanceof Error ? err.message : "errore"));
    }
  }

  const seen = new Set<string>();
  const merged: OsmCandidate[] = [];
  for (const c of [...osm, ...geo]) {
    const k = dedupKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(c);
  }

  const seenNames = new Set(merged.map((c) => normName(c.name)));
  for (const c of ai) {
    const n = normName(c.name);
    if (!n || seenNames.has(n)) continue;
    seenNames.add(n);
    merged.push(c);
  }

  const scored = merged
    .map((c) => {
      const s = scoreCandidate(c);
      return { ...c, priorityScore: s.score, priorityReason: s.reason, websiteStatus: s.websiteStatus };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  if (scored.length === 0 && !osmOk && (!geoEnabled || geo.length === 0)) {
    const message =
      warnings.length > 0
        ? warnings.join(" | ")
        : "Nessuna fonte di ricerca disponibile al momento. Riprova tra poco.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count: scored.length,
    candidates: scored,
    sources: {
      osm: osmOk ? osm.length : null,
      geoapify: geoEnabled ? geo.length : null,
      ai: useAi ? (aiUsed ? ai.length : null) : null,
    },
    warnings,
  });
}
