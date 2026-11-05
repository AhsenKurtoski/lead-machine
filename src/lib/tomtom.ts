// ============================================================
// Terza fonte: TomTom Places Search (Discover v3).
// Si affianca a OpenStreetMap/Overpass e a Geoapify: quando una
// fonte non copre una zona (o e' sovraccarica) le altre due la
// coprono. La chiave e' gratuita e non richiede carta di credito
// (5.000 richieste/mese sul piano Discover: docs.tomtom.com/pricing).
//
// - Chiave: prima dalle Impostazioni (tomtom_api_key), poi da .env
//   (TOMTOM_API_KEY). Senza chiave la funzione torna [] e l'app
//   continua con le altre fonti: questa fonte non e' obbligatoria.
// - Endpoint: POST https://api.tomtom.com/maps/orbis/places/discover
//   con `filters.geometry` circolare (centro + raggio) e
//   `filters.types: ["poi"]`. Le coordinate sono [longitudine, latitudine].
// - I risultati hanno la STESSA forma di OsmCandidate, quindi punteggio,
//   deduplica e salvataggio dei lead restano invariati.
//
// Nota sulle categorie: TomTom cerca per testo (`query`) dentro il cerchio,
// quindi la pertinenza la decide lui. I `tokens` qui sotto servono a dare
// l'etichetta giusta (`category`/`categoryLabel`) quando il tipo di POI
// restituito e' riconoscibile; se nessun token combacia il risultato resta,
// etichettato con la categoria richiesta — meglio un lead in piu' da
// controllare che un'attivita' vera nascosta. Il filtro `poiTypes` viene usato
// solo dove l'identificativo e' documentato da TomTom, per non rischiare un
// filtro inventato che azzererebbe i risultati.
// ============================================================

import { getSettings } from "@/lib/settings";
import { getCategoryById } from "@/lib/categories";
import { normalizePhone, type OsmCandidate } from "@/lib/overpass";

function clean(v: string | undefined | null): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

/** Chiave TomTom: prima Impostazioni (DB), poi variabile d'ambiente. */
export async function getTomTomKey(): Promise<string> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    s = {};
  }
  return clean(s.tomtom_api_key) || clean(process.env.TOMTOM_API_KEY);
}

/** true se TomTom e' configurato (chiave in Impostazioni o in .env). */
export async function tomtomEnabled(): Promise<boolean> {
  return Boolean(await getTomTomKey());
}

type TomTomMap = {
  /** Testo della ricerca: e' quello che fa il lavoro di selezione. */
  query: string;
  /** Tipi di POI riconosciuti (id o nome TomTom) per dare l'etichetta giusta. */
  tokens: string[];
  /** Id `poiTypes` documentati: si usano solo quando sono sicuri. */
  poiTypes?: string[];
};

export const TOMTOM_MAP: Record<string, TomTomMap> = {
  hotel: { query: "hotel", tokens: ["hotel"], poiTypes: ["hotel"] },
  bnb: { query: "bed and breakfast", tokens: ["bed_and_breakfast", "guest_house", "hostel", "motel"] },
  agriturismo: { query: "agriturismo farm stay", tokens: ["agritourism", "farm_stay", "farm"] },

  ristorante: { query: "restaurant", tokens: ["restaurant"], poiTypes: ["restaurant"] },
  pizzeria: { query: "pizza", tokens: ["pizza", "fast_food"] },
  bar: { query: "bar cafe", tokens: ["bar", "cafe", "pub", "coffee"], poiTypes: ["bar"] },
  pasticceria: { query: "pastry shop", tokens: ["confectionery", "pastry"] },
  gelateria: { query: "ice cream", tokens: ["ice_cream", "icecream"] },
  enoteca: { query: "wine shop", tokens: ["wine", "liquor", "beverages"] },

  parrucchiere: { query: "hairdresser", tokens: ["hairdresser", "barber"], poiTypes: ["hairdresser"] },
  estetista: { query: "beauty salon", tokens: ["beauty", "beauty_salon"] },
  spa: { query: "spa wellness", tokens: ["spa", "wellness"] },
  palestra: { query: "gym fitness", tokens: ["fitness", "sports", "gym"] },

  idraulico: { query: "plumber", tokens: ["plumber"] },
  elettricista: { query: "electrician", tokens: ["electrician"] },
  falegname: { query: "carpenter", tokens: ["carpenter", "joiner"] },
  edile: { query: "construction company", tokens: ["builder", "construction", "contractor"] },
  fotografo: { query: "photographer", tokens: ["photo"] },

  panetteria: { query: "bakery", tokens: ["bakery", "bread"] },
  macelleria: { query: "butcher", tokens: ["butcher", "meat"] },
  abbigliamento: { query: "clothing store", tokens: ["clothing", "clothes", "shoes", "fashion", "boutique"] },
  fiorista: { query: "florist", tokens: ["florist", "flower"] },
  gioielleria: { query: "jewelry store", tokens: ["jewel", "jewellery"] },
  animali: { query: "pet shop", tokens: ["pet"] },

  dentista: { query: "dentist", tokens: ["dentist", "dental"], poiTypes: ["dentist"] },
  fisioterapista: { query: "physiotherapist", tokens: ["physio", "rehabilitation"] },

  avvocato: { query: "lawyer", tokens: ["lawyer", "legal"], poiTypes: ["legal_services"] },
  commercialista: { query: "accountant", tokens: ["accountant", "bookkeeping"] },
  immobiliare: { query: "real estate agency", tokens: ["estate_agent", "real_estate"] },

  autofficina: { query: "car repair", tokens: ["car_repair", "vehicle_repair"], poiTypes: ["car_repair_and_service"] },
  autolavaggio: { query: "car wash", tokens: ["car_wash"] },
  autoscuola: { query: "driving school", tokens: ["driving_school", "driving"] },
};

// --- Forma della risposta (documentazione Discover v3) ----------------------

export type TomTomPoiType = {
  id?: string;
  name?: string;
  groupId?: string;
  parentId?: string;
  /** Ruolo del tipo nel risultato ("preferred" per quello principale). */
  role?: string;
};

export type TomTomResult = {
  id?: string;
  title?: string;
  type?: string;
  poiTypes?: TomTomPoiType[];
  position?: { coordinates?: number[]; type?: string };
  address?: {
    freeformAddress?: string;
    street?: string;
    houseNumber?: string;
    municipality?: string;
    postalCode?: string;
    countrySubdivision?: string;
    country?: string;
  };
  contacts?: Array<{ type?: string; phones?: string[]; websites?: string[] }>;
  distanceInMeters?: number;
};

/** Solo i campi che ci servono: un `Attributes` generico costa di piu'. */
export const TOMTOM_ATTRIBUTES =
  "results(id,title,type,poiTypes,position,address,contacts,distanceInMeters)";

/**
 * Riconosce la categoria interna dall'elenco di tipi POI restituiti da TomTom.
 * `fallback` viene usato quando nessun token combacia: il risultato arriva
 * comunque da una ricerca per quella categoria, quindi non lo buttiamo.
 */
export function matchTomTomCategory(
  poiTypes: TomTomPoiType[],
  ids: string[],
  fallback: string | null
): { id: string; label: string } | null {
  const hay = poiTypes
    .map((t) => [t.id, t.name, t.parentId].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();
  if (hay) {
    for (const id of ids) {
      const m = TOMTOM_MAP[id];
      if (m && m.tokens.some((t) => hay.includes(t))) {
        return { id, label: getCategoryById(id)?.label ?? id };
      }
    }
  }
  if (!fallback) return null;
  return { id: fallback, label: getCategoryById(fallback)?.label ?? fallback };
}

/** Etichetta generica quando non si e' chiesta una categoria precisa. */
export function genericTomTomLabel(poiTypes: TomTomPoiType[]): string {
  const raw = poiTypes[0]?.name || poiTypes[0]?.id || "";
  const words = raw.replace(/_/g, " ").trim();
  if (!words) return "Altro";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Converte un risultato TomTom in un candidato (stessa forma di OSM/Geoapify).
 * `fallbackCategory` e' la categoria richiesta (null quando si cercano tutte).
 */
export function toTomTomCandidate(
  result: TomTomResult,
  ids: string[],
  fallbackCategory: string | null
): OsmCandidate | null {
  const name = (result.title ?? "").trim();
  if (!name) return null;

  const coords = result.position?.coordinates ?? [];
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const poiTypes = Array.isArray(result.poiTypes) ? result.poiTypes : [];
  const matched = matchTomTomCategory(poiTypes, ids, fallbackCategory);
  const category = matched ? matched.id : "altro";
  const categoryLabel = matched ? matched.label : genericTomTomLabel(poiTypes);

  const contact = Array.isArray(result.contacts) ? result.contacts[0] : undefined;
  const phone = contact?.phones?.find((p) => (p ?? "").trim());
  const website = contact?.websites?.find((w) => (w ?? "").trim());
  const address = result.address ?? {};
  const street = [address.street, address.houseNumber].filter(Boolean).join(" ").trim();

  return {
    osmId: "tomtom/" + (result.id || name + "_" + lat + "_" + lng),
    name,
    category,
    categoryLabel,
    lat,
    lng,
    addressFull: (address.freeformAddress || street || undefined) as string | undefined,
    city: address.municipality || undefined,
    postalCode: address.postalCode || undefined,
    phone,
    whatsapp: normalizePhone(phone),
    // TomTom restituisce telefono e sito ufficiali; email e social non ci sono,
    // e non li inventiamo (li trova l'arricchimento contatti dal sito).
    email: undefined,
    website,
    instagram: undefined,
    facebook: undefined,
    tiktok: undefined,
    hasWebsite: Boolean(website),
    hasSocial: false,
  };
}

type RequestPlan = { query: string; poiTypes?: string[]; fallback: string | null };

/** Cosa chiedere a TomTom per la selezione di categorie dell'utente. */
export function planTomTomRequests(categoryIds: string[]): RequestPlan[] {
  const ids = categoryIds.filter((id) => TOMTOM_MAP[id]);
  if (categoryIds.length > 0 && ids.length === 0) return [];
  if (ids.length === 0) {
    // Nessuna categoria scelta: tutti i POI della zona, etichetta dedotta.
    return [{ query: "", fallback: null }];
  }
  return ids.map((id) => {
    const m = TOMTOM_MAP[id];
    return { query: m.query, poiTypes: m.poiTypes, fallback: id };
  });
}

/** Una richiesta Discover dentro un cerchio. */
async function discover(
  plan: RequestPlan,
  lat: number,
  lng: number,
  radiusM: number,
  key: string,
  timeoutMs: number
): Promise<TomTomResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = {
      query: plan.query,
      origin: { type: "point", coordinates: [lng, lat] },
      maxResults: 100,
      filters: {
        types: ["poi"],
        geometry: {
          type: "circle",
          center: { type: "point", coordinates: [lng, lat] },
          radiusInMeters: Math.max(1, Math.min(Math.round(radiusM), 1_000_000)),
        },
        ...(plan.poiTypes ? { poiTypes: plan.poiTypes } : {}),
      },
    };
    const res = await fetch("https://api.tomtom.com/maps/orbis/places/discover", {
      method: "POST",
      headers: {
        "TomTom-Api-Key": key,
        "TomTom-Api-Version": "3",
        Attributes: TOMTOM_ATTRIBUTES,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error("TomTom " + res.status);
    }
    const json = (await res.json()) as { results?: TomTomResult[] };
    return Array.isArray(json.results) ? json.results : [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ricerca su TomTom. Non e' mai bloccante: senza chiave torna []; se una
 * categoria fallisce si tengono le altre; lancia solo se TUTTE falliscono.
 * Le categorie si chiedono in parallelo: e' la ragione per cui questa fonte
 * non allunga i tempi della ricerca.
 */
export async function runTomTomSearch(
  categoryIds: string[],
  lat: number,
  lng: number,
  radiusM: number,
  timeoutMs = 20000
): Promise<OsmCandidate[]> {
  const key = await getTomTomKey();
  if (!key) return [];

  const plans = planTomTomRequests(categoryIds);
  if (plans.length === 0) return [];

  const allIds = categoryIds.length > 0 ? categoryIds : Object.keys(TOMTOM_MAP);
  const settled = await Promise.allSettled(
    plans.map((p) => discover(p, lat, lng, radiusM, key, timeoutMs))
  );

  const ok = settled.filter((s) => s.status === "fulfilled") as PromiseFulfilledResult<TomTomResult[]>[];
  if (ok.length === 0) {
    const first = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
    const detail = first && first.reason instanceof Error && first.reason.message ? " (" + first.reason.message + ")" : "";
    throw new Error("TomTom non raggiungibile o chiave non valida" + detail);
  }

  const out: OsmCandidate[] = [];
  const seen = new Set<string>();
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") return;
    const plan = plans[i];
    for (const result of s.value) {
      const c = toTomTomCandidate(result, allIds, plan.fallback);
      if (!c) continue;
      if (seen.has(c.osmId)) continue;
      seen.add(c.osmId);
      out.push(c);
    }
  });
  return out;
}
