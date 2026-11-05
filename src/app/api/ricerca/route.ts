import { NextResponse } from "next/server";
import { runOverpassSearch, type OsmCandidate } from "@/lib/overpass";
import { runGeoapifySearch, geoapifyEnabled } from "@/lib/geoapify";
import { runTomTomSearch, tomtomEnabled } from "@/lib/tomtom";
import { runAiFinderSearch } from "@/lib/ai-finder";
import { getCategoryById } from "@/lib/categories";
import { scoreCandidate } from "@/lib/scoring";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";
import { withTimeout } from "@/lib/api-auth";
import { getSettings } from "@/lib/settings";
import { resolveSearchArea } from "@/lib/search-area";

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

  const geoapifyMode = asString(body.geoapifyMode, 10) || "";

  // Nessuna citta o coordinata scritta nel codice: l'area arriva dalla
  // richiesta (centers, lat/lng) oppure dalle impostazioni salvate in
  // onboarding. Le variabili NEXT_PUBLIC_SEARCH_* restano solo come override
  // di deploy, non come valore di default.
  const settings = await getSettings();
  // Contatto OSM: quello salvato in Impostazioni, altrimenti l'ambiente.
  // Non e' una chiave: serve solo a identificare le richieste (policy OSM).
  const contactEmail = settings.osm_contact_email || process.env.OSM_CONTACT_EMAIL || "";
  const areaResult = await resolveSearchArea({
    city: asString(body.searchCity, 200),
    lat: body.lat ?? process.env.NEXT_PUBLIC_SEARCH_LAT,
    lng: body.lng ?? process.env.NEXT_PUBLIC_SEARCH_LNG,
    radiusM: asInt(body.radius_m) ?? asInt(body.radius),
    contactEmail,
    settings: {
      ...settings,
      search_city: settings.search_city || process.env.NEXT_PUBLIC_SEARCH_CITY || "",
      search_lat: settings.search_lat || process.env.NEXT_PUBLIC_SEARCH_LAT || "",
      search_lng: settings.search_lng || process.env.NEXT_PUBLIC_SEARCH_LNG || "",
      search_radius_m: settings.search_radius_m || process.env.NEXT_PUBLIC_SEARCH_RADIUS_M || "",
    },
  });
  // Raggio: quello risolto per l'area, altrimenti quello chiesto dal client,
  // altrimenti l'override di deploy.
  const requestedRadius = asInt(body.radius_m) ?? asInt(body.radius);
  const envRadius = Number(process.env.NEXT_PUBLIC_SEARCH_RADIUS_M ?? "5000");
  const radius =
    areaResult.area?.radiusM ?? requestedRadius ?? (Number.isFinite(envRadius) ? envRadius : 5000);
  const cityName = areaResult.area?.city ?? "";

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
  if (centers.length === 0) {
    // Nessun centro esplicito: usiamo l'area configurata. Se non c'e', non
    // inventiamo una zona: meglio un errore chiaro che una ricerca a caso.
    if (!areaResult.area) {
      return NextResponse.json({ ok: false, error: areaResult.warning }, { status: 400 });
    }
    centers.push({ lat: areaResult.area.lat, lng: areaResult.area.lng, city: areaResult.area.city });
  }

  const warnings: string[] = [];

  // Budget globale di tempo: i mirror Overpass e i provider AI possono essere
  // lenti o irraggiungibili. Smettiamo di interrogare nuove fonti quando il tempo
  // e scaduto, cosi la ricerca risponde comunque con quello che e' riuscito a trovare.
  const START = Date.now();
  const BUDGET_MS = 100_000;
  const remaining = () => BUDGET_MS - (Date.now() - START);
  const budgetLeft = () => Math.min(Math.max(remaining() - 5_000, 5_000), 60_000);

  // Ogni fonte ha il proprio budget di tempo. Prima era "tutto il tempo che
  // resta" per la fonte in coda, quindi una fonte lenta poteva consumare il
  // budget e lasciare le altre senza tempo.
  const sourceBudget = () => Math.min(Math.max(Math.floor(BUDGET_MS / 2), 15_000), 45_000);

  // OpenStreetMap: un centro alla volta (i mirror pubblici non amano le
  // raffiche dallo stesso IP).
  async function searchOsm(): Promise<{ list: OsmCandidate[]; ok: boolean }> {
    let list: OsmCandidate[] = [];
    let ok = false;
    for (const center of centers) {
      if (remaining() <= 0) {
        warnings.push("Tempo di ricerca esaurito: alcune zone non sono state interrogate.");
        break;
      }
      const budget = Math.min(sourceBudget(), Math.max(remaining() - 5_000, 5_000));
      try {
        const part = await withTimeout(
          // Il budget passa anche a runOverpassSearch: la catena mirror si ferma
          // da sola prima che scatti il timeout esterno.
          runOverpassSearch(categories, center.lat, center.lng, radius, contactEmail, budget),
          budget,
          "OpenStreetMap"
        );
        list = list.concat(part);
        ok = true;
      } catch (err) {
        warnings.push("OpenStreetMap (" + (center.city ?? "zona") + "): " + (err instanceof Error ? err.message : "errore"));
      }
    }
    return { list, ok };
  }

  async function searchGeoapify(): Promise<{ list: OsmCandidate[]; enabled: boolean }> {
    if (!(await geoapifyEnabled())) return { list: [], enabled: false };
    let list: OsmCandidate[] = [];
    for (const center of centers) {
      if (remaining() <= 0) {
        warnings.push("Tempo di ricerca esaurito: Geoapify non e' stato interrogato.");
        break;
      }
      try {
        const part = await withTimeout(
          runGeoapifySearch(categories, center.lat, center.lng, radius),
          sourceBudget(),
          "Geoapify"
        );
        list = list.concat(part);
      } catch (err) {
        warnings.push("Geoapify (" + (center.city ?? "zona") + "): " + (err instanceof Error ? err.message : "errore"));
      }
    }
    return { list, enabled: true };
  }

  async function searchTomTom(): Promise<{ list: OsmCandidate[]; enabled: boolean }> {
    if (!(await tomtomEnabled())) return { list: [], enabled: false };
    let list: OsmCandidate[] = [];
    for (const center of centers) {
      if (remaining() <= 0) {
        warnings.push("Tempo di ricerca esaurito: TomTom non e' stato interrogato.");
        break;
      }
      try {
        const part = await withTimeout(
          runTomTomSearch(categories, center.lat, center.lng, radius),
          sourceBudget(),
          "TomTom"
        );
        list = list.concat(part);
      } catch (err) {
        warnings.push("TomTom (" + (center.city ?? "zona") + "): " + (err instanceof Error ? err.message : "errore"));
      }
    }
    return { list, enabled: true };
  }

  // Le fonti geografiche sono indipendenti fra loro: partono INSIEME. In
  // sequenza il tempo era la somma dei tempi (OSM + Geoapify + TomTom); cosi'
  // e' quello della fonte piu' lenta, e i lead arrivano prima.
  const [osmResult, geoResult, tomtomResult, aiResult] = await Promise.all([
    searchOsm(),
    searchGeoapify(),
    searchTomTom(),
    searchAi(),
  ]);
  const osm = osmResult.list;
  const osmOk = osmResult.ok;
  const geo = geoResult.list;
  const geoEnabled = geoResult.enabled;
  const tomtom = tomtomResult.list;
  const tomtomOn = tomtomResult.enabled;
  const ai = aiResult.list;
  const aiUsed = aiResult.used;

  // Il cercatore AI non dipende dalle fonti geografiche: e' un'altra fonte, con
  // gli stessi input. Parte insieme alle altre, cosi' il suo tempo (una chiamata
  // al modello) si nasconde dietro la piu' lenta invece di sommarsi.
  async function searchAi(): Promise<{ list: OsmCandidate[]; used: boolean }> {
    if (!useAi || remaining() <= 0) return { list: [], used: false };
    try {
      const labels = categories
        .map((id) => getCategoryById(id)?.label)
        .filter((l): l is string => Boolean(l));
      // Etichetta dell'area per il prompt: arriva dal client (che l'ha chiesta
      // a OpenStreetMap) oppure e' la citta scelta. Nessuna provincia cablata.
      const requestedLabel = asString(body.areaLabel, 120)?.trim();
      const aiCity =
        centers.length > 1
          ? requestedLabel || cityName || "zona di ricerca"
          : centers[0].city ?? cityName;
      const res = await withTimeout(
        runAiFinderSearch(labels, centers[0].lat, centers[0].lng, radius, aiCity),
        sourceBudget(),
        "AI"
      );
      return { list: res.candidates, used: res.used };
    } catch (err) {
      warnings.push("AI (Gemini): " + (err instanceof Error ? err.message : "errore"));
      return { list: [], used: false };
    }
  }

  const seen = new Set<string>();
  const merged: OsmCandidate[] = [];
  for (const c of [...osm, ...geo, ...tomtom]) {
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

  if (scored.length === 0 && !osmOk && (!geoEnabled || geo.length === 0) && tomtom.length === 0) {
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
      tomtom: tomtomOn ? tomtom.length : null,
      ai: useAi ? (aiUsed ? ai.length : null) : null,
    },
    warnings,
  });
}
