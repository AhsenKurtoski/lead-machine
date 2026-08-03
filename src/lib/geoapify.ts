// ============================================================
// Fonte aggiuntiva: Geoapify Places API (gratuita, senza carta).
// Si affianca a OpenStreetMap/Overpass per aumentare la copertura
// delle attivita trovate, soprattutto quando OSM e' incompleto o
// momentaneamente sovraccarico.
//
// - La chiave viene letta PRIMA dalle Impostazioni (database),
//   POI dalla variabile d'ambiente GEOAPIFY_API_KEY (.env).
// - Se non c'e' la chiave, la funzione restituisce semplicemente
//   un elenco vuoto: l'app continua a funzionare con la sola OSM.
// - I risultati hanno la STESSA forma di OsmCandidate, cosi'
//   punteggio, dedup e salvataggio lead restano invariati.
// Free tier: 3000 richieste/giorno. Docs: apidocs.geoapify.com/docs/places
// ============================================================

import { getSettings } from "@/lib/settings";
import { getCategoryById } from "@/lib/categories";
import { normalizePhone, type OsmCandidate } from "@/lib/overpass";

function clean(v: string | undefined | null): string {
  return (v ?? "").trim().replace(/^[\"']|[\"']$/g, "").trim();
}

// Legge la chiave Geoapify: prima Impostazioni (DB), poi .env.
export async function getGeoapifyKey(): Promise<string> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    s = {};
  }
  return clean(s.geoapify_api_key) || clean(process.env.GEOAPIFY_API_KEY);
}

// true se Geoapify e' configurato (chiave presente in DB o .env).
export async function geoapifyEnabled(): Promise<boolean> {
  return Boolean(await getGeoapifyKey());
}

// Mappa: categoria interna -> categorie Geoapify da interrogare (top-level
// sicure, sempre valide) + token usati per riconoscere il risultato giusto
// tra quelli restituiti (match sui nomi-categoria Geoapify).
type GeoMap = { query: string[]; tokens: string[] };

const GEOAPIFY_MAP: Record<string, GeoMap> = {
  hotel: { query: ["accommodation"], tokens: ["hotel"] },
  bnb: { query: ["accommodation"], tokens: ["guest_house", "apartment", "bed_and_breakfast", "hostel", "motel"] },
  agriturismo: { query: ["accommodation"], tokens: ["chalet", "farm", "agritourism", "hut"] },

  ristorante: { query: ["catering"], tokens: ["restaurant"] },
  pizzeria: { query: ["catering"], tokens: ["fast_food", "pizza"] },
  bar: { query: ["catering"], tokens: ["bar", "cafe", "pub", "coffee", "biergarten"] },
  pasticceria: { query: ["commercial", "catering"], tokens: ["confectionery", "pastry"] },
  gelateria: { query: ["catering", "commercial"], tokens: ["ice_cream"] },
  enoteca: { query: ["commercial"], tokens: ["wine", "alcohol", "beverages"] },

  parrucchiere: { query: ["service"], tokens: ["hairdresser", "barber"] },
  estetista: { query: ["service"], tokens: ["beauty"] },
  spa: { query: ["leisure", "service"], tokens: ["spa"] },
  palestra: { query: ["sport", "leisure"], tokens: ["fitness", "sports_centre", "gym"] },

  idraulico: { query: ["service", "commercial", "activity"], tokens: ["plumber"] },
  elettricista: { query: ["service", "commercial", "activity"], tokens: ["electrician", "electronics"] },
  falegname: { query: ["service", "commercial", "activity"], tokens: ["carpenter", "joiner"] },
  edile: { query: ["service", "commercial", "activity"], tokens: ["builder", "construction"] },
  fotografo: { query: ["service", "commercial", "activity"], tokens: ["photo"] },

  panetteria: { query: ["commercial"], tokens: ["bakery"] },
  macelleria: { query: ["commercial"], tokens: ["butcher"] },
  abbigliamento: { query: ["commercial"], tokens: ["clothing", "clothes", "shoes", "fashion", "boutique"] },
  fiorista: { query: ["commercial"], tokens: ["florist", "garden"] },
  gioielleria: { query: ["commercial"], tokens: ["jewelry", "jewellery"] },
  animali: { query: ["commercial", "pet"], tokens: ["pet"] },

  dentista: { query: ["healthcare"], tokens: ["dentist"] },
  fisioterapista: { query: ["healthcare"], tokens: ["physiotherapist", "physio"] },

  avvocato: { query: ["office", "service"], tokens: ["lawyer"] },
  commercialista: { query: ["office", "service"], tokens: ["accountant", "tax_advisor", "tax"] },
  immobiliare: { query: ["office", "service"], tokens: ["estate_agent", "estate"] },

  autofficina: { query: ["service", "commercial"], tokens: ["car_repair", "vehicle"] },
  autolavaggio: { query: ["service", "commercial"], tokens: ["car_wash"] },
  autoscuola: { query: ["education", "service"], tokens: ["driving_school", "driving"] },
};

type GeoProps = Record<string, any>;
type GeoFeature = { properties?: GeoProps };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Legge un valore tra piu chiavi possibili (tag grezzi OSM dentro Geoapify).
function firstOf(obj: Record<string, any>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

// Una richiesta a Geoapify per UNA categoria top-level, dentro un cerchio.
async function fetchCategory(
  category: string,
  lat: number,
  lng: number,
  radiusM: number,
  key: string,
  timeoutMs: number
): Promise<GeoFeature[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url =
      "https://api.geoapify.com/v2/places?categories=" +
      encodeURIComponent(category) +
      "&filter=circle:" + lng + "," + lat + "," + radiusM +
      "&bias=proximity:" + lng + "," + lat +
      "&limit=500&lang=it&apiKey=" + encodeURIComponent(key);
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error("Geoapify " + res.status);
    }
    const json = (await res.json()) as { features?: GeoFeature[] };
    return json.features ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// Trova la categoria interna piu adatta in base ai nomi-categoria Geoapify.
function matchOurCategory(
  catStrings: string[],
  ids: string[]
): { id: string; label: string } | null {
  const hay = catStrings.join(" ").toLowerCase();
  for (const id of ids) {
    const m = GEOAPIFY_MAP[id];
    if (m && m.tokens.some((t) => hay.includes(t))) {
      const label = getCategoryById(id)?.label ?? id;
      return { id, label };
    }
  }
  return null;
}

// Etichetta generica ricavata dall'ultimo segmento della categoria Geoapify.
function genericLabel(catStrings: string[]): string {
  const first = catStrings.find((c) => c.includes(".")) ?? catStrings[0] ?? "";
  const seg = first.split(".").pop() ?? "";
  if (!seg) return "Altro";
  const words = seg.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function toCandidate(
  feature: GeoFeature,
  ids: string[],
  selectionEmpty: boolean
): OsmCandidate | null {
  const p = feature.properties ?? {};
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) return null;

  const lat = typeof p.lat === "number" ? p.lat : Number(p.lat);
  const lng = typeof p.lon === "number" ? p.lon : Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const catList: string[] = Array.isArray(p.categories) ? p.categories : [];
  const matched = matchOurCategory(catList, ids);

  // Con una selezione precisa di categorie, teniamo solo i risultati pertinenti.
  // Senza selezione (ricerca "tutte"), teniamo tutto con etichetta generica.
  if (!matched && !selectionEmpty) return null;

  const category = matched ? matched.id : "altro";
  const categoryLabel = matched ? matched.label : genericLabel(catList);

  // I tag grezzi OSM, quando presenti, contengono i contatti reali.
  const raw: Record<string, any> =
    p.datasource && typeof p.datasource === "object" && p.datasource.raw && typeof p.datasource.raw === "object"
      ? p.datasource.raw
      : {};

  const website = firstOf(raw, [
    "website",
    "contact:website",
    "url",
    "website:official",
    "official_website",
    "contact:url",
    "brand:website",
  ]);
  const instagram = firstOf(raw, ["contact:instagram", "instagram"]);
  const facebook = firstOf(raw, ["contact:facebook", "facebook"]);
  const tiktok = firstOf(raw, ["contact:tiktok", "tiktok"]);
  const phone =
    firstOf(raw, ["phone", "contact:phone", "contact:mobile", "mobile"]) ||
    (typeof p.contact === "object" && p.contact ? firstOf(p.contact, ["phone", "mobile"]) : undefined);
  const email = firstOf(raw, ["email", "contact:email"]);

  const placeId = typeof p.place_id === "string" && p.place_id ? p.place_id : name + "_" + lat + "_" + lng;

  const addressFull =
    (typeof p.address_line2 === "string" && p.address_line2.trim()) ||
    (typeof p.formatted === "string" && p.formatted.trim()) ||
    undefined;

  return {
    osmId: "geoapify/" + placeId,
    name,
    category,
    categoryLabel,
    lat,
    lng,
    addressFull: addressFull || undefined,
    city: typeof p.city === "string" ? p.city : undefined,
    postalCode: typeof p.postcode === "string" ? p.postcode : undefined,
    phone,
    whatsapp: normalizePhone(phone),
    email,
    website,
    instagram,
    facebook,
    tiktok,
    hasWebsite: Boolean(website),
    hasSocial: Boolean(instagram || facebook || tiktok),
  };
}

// Ricerca su Geoapify. Restituisce candidati nella forma OsmCandidate.
// Non e' mai bloccante: se non c'e' chiave torna []; se una richiesta
// fallisce si continua con le altre; lancia solo se TUTTE falliscono.
export async function runGeoapifySearch(
  categoryIds: string[],
  lat: number,
  lng: number,
  radiusM: number
): Promise<OsmCandidate[]> {
  const key = await getGeoapifyKey();
  if (!key) return [];

  const selectionEmpty = categoryIds.length === 0;
  const ids = selectionEmpty ? Object.keys(GEOAPIFY_MAP) : categoryIds.filter((id) => GEOAPIFY_MAP[id]);

  // Categorie top-level Geoapify da interrogare (unione, senza duplicati).
  const topSet = new Set<string>();
  for (const id of ids) {
    const m = GEOAPIFY_MAP[id];
    if (m) for (const q of m.query) topSet.add(q);
  }
  const topLevels = Array.from(topSet);
  if (topLevels.length === 0) return [];

  const features: GeoFeature[] = [];
  let okCount = 0;
  let lastErr: unknown = null;
  for (const cat of topLevels) {
    try {
      const part = await fetchCategory(cat, lat, lng, radiusM, key, 20000);
      features.push(...part);
      okCount++;
    } catch (e) {
      lastErr = e;
      // categoria fallita: continuiamo con le altre per salvare il salvabile
      await sleep(300);
    }
  }

  if (okCount === 0) {
    const detail = lastErr instanceof Error && lastErr.message ? " (" + lastErr.message + ")" : "";
    throw new Error("Geoapify non raggiungibile o chiave non valida" + detail);
  }

  const out: OsmCandidate[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const c = toCandidate(f, ids, selectionEmpty);
    if (!c) continue;
    if (seen.has(c.osmId)) continue;
    seen.add(c.osmId);
    out.push(c);
  }
  return out;
}
