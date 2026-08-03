import { CATEGORIES, getCategoryById, type Category } from "./categories";

export type OsmCandidate = {
  osmId: string;
  name: string;
  category: string;
  categoryLabel: string;
  lat: number;
  lng: number;
  addressFull?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  hasWebsite: boolean;
  hasSocial: boolean;
};

// Piu endpoint pubblici gratuiti: se uno e sovraccarico (504) si prova il successivo.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Errore Overpass con flag "transient": true se vale la pena riprovare (504, timeout...).
class OverpassError extends Error {
  transient: boolean;
  status: number;
  constructor(message: string, transient: boolean, status = 0) {
    super(message);
    this.name = "OverpassError";
    this.transient = transient;
    this.status = status;
  }
}

// Stati HTTP per cui vale la pena riprovare (server occupato o richiesta rifiutata da un mirror).
const TRANSIENT_STATUS = [403, 405, 406, 408, 425, 429, 500, 502, 503, 504];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Normalizza un numero italiano in formato wa.me (39XXXXXXXXXX)
export function normalizePhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  let digits = raw.replace(/[^0-9+]/g, "");
  digits = digits.replace(/^00/, "");
  digits = digits.replace(/^\+/, "");
  if (digits.startsWith("39")) return digits;
  if (digits.startsWith("3") || digits.startsWith("0")) return "39" + digits;
  return digits || undefined;
}

// Costruisce la query Overpass QL per le categorie scelte
export function buildOverpassQuery(
  categoryIds: string[],
  lat: number,
  lng: number,
  radiusM: number
): string {
  const cats: Category[] =
    categoryIds.length > 0
      ? (categoryIds.map(getCategoryById).filter(Boolean) as Category[])
      : CATEGORIES;

  const lines: string[] = [];
  for (const cat of cats) {
    for (const [key, value] of cat.selectors) {
      lines.push(
        `  nwr["${key}"="${value}"]["name"](around:${radiusM},${lat},${lng});`
      );
    }
  }

  return `[out:json][timeout:60];\n(\n${lines.join("\n")}\n);\nout center tags;`;
}

function firstTag(tags: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (tags[k]) return tags[k];
  }
  return undefined;
}

// Trova a quale categoria appartiene un elemento in base ai suoi tag
function matchCategory(tags: Record<string, string>): Category | undefined {
  for (const cat of CATEGORIES) {
    for (const [key, value] of cat.selectors) {
      if (tags[key] === value) return cat;
    }
  }
  return undefined;
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const street = tags["addr:street"];
  const num = tags["addr:housenumber"];
  const city = tags["addr:city"];
  const parts: string[] = [];
  if (street) parts.push(num ? `${street} ${num}` : street);
  if (city) parts.push(city);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function isTransient(err: unknown): boolean {
  if (err instanceof OverpassError) return err.transient;
  if (err instanceof Error) {
    if (err.name === "AbortError") return true;
    return /fetch failed|network|ECONNRESET|ETIMEDOUT|timeout/i.test(err.message);
  }
  return false;
}

// Richiesta singola a un endpoint, in POST oppure in GET, con timeout lato client.
async function rawFetch(
  endpoint: string,
  query: string,
  contactEmail: string,
  timeoutMs: number,
  useGet: boolean
): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      // Senza Accept alcuni server Overpass rispondono 406 Not Acceptable.
      Accept: "application/json",
      "User-Agent": "LeadMachine/1.0 (" + contactEmail + ")",
    };
    let url = endpoint;
    let body: string | undefined;
    if (useGet) {
      url = endpoint + "?data=" + encodeURIComponent(query);
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = "data=" + encodeURIComponent(query);
    }
    const res = await fetch(url, {
      method: useGet ? "GET" : "POST",
      headers,
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const transient = TRANSIENT_STATUS.includes(res.status);
      throw new OverpassError("Overpass " + res.status, transient, res.status);
    }
    const json = (await res.json()) as { elements?: OverpassElement[] };
    return json.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// Una richiesta Overpass: prova in POST e, se il mirror rifiuta il metodo (405/406), ritenta in GET.
async function fetchOverpass(
  endpoint: string,
  query: string,
  contactEmail: string,
  timeoutMs: number
): Promise<OverpassElement[]> {
  try {
    return await rawFetch(endpoint, query, contactEmail, timeoutMs, false);
  } catch (err) {
    if (err instanceof OverpassError && (err.status === 405 || err.status === 406)) {
      // Alcuni mirror accettano solo GET: riprova sullo stesso endpoint in GET.
      return await rawFetch(endpoint, query, contactEmail, timeoutMs, true);
    }
    throw err;
  }
}

// Esegue una query provando piu endpoint in piu giri, con backoff crescente
// sui guasti temporanei (504/timeout). Su errori NON temporanei (es. 400) si ferma subito.
async function execQueryWithRetry(
  query: string,
  contactEmail: string,
  rounds = 2
): Promise<OverpassElement[]> {
  let lastError: unknown = null;
  for (let round = 0; round < rounds; round++) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        return await fetchOverpass(endpoint, query, contactEmail, 65000);
      } catch (err) {
        lastError = err;
        if (!isTransient(err)) throw err;
        await sleep(700 + round * 1200);
      }
    }
  }
  throw lastError ?? new Error("Overpass non raggiungibile");
}

export async function runOverpassSearch(
  categoryIds: string[],
  lat: number,
  lng: number,
  radiusM: number,
  contactEmail: string
): Promise<OsmCandidate[]> {
  // 1) Tentativo con query unica (tutte le categorie insieme): piu veloce.
  try {
    const query = buildOverpassQuery(categoryIds, lat, lng, radiusM);
    const elements = await execQueryWithRetry(query, contactEmail, 2);
    return parseElements(elements);
  } catch (err) {
    // Se l'errore non e temporaneo (es. query errata), inutile insistere.
    if (!isTransient(err)) throw err;
    // Altrimenti: il server e sovraccarico -> passiamo al piano B (query spezzate).
  }

  // 2) Fallback anti-504: spezziamo le categorie in piccoli gruppi e uniamo i risultati.
  const ids = categoryIds.length > 0 ? categoryIds : CATEGORIES.map((c) => c.id);
  const groups = chunkArray(ids, 3);

  const merged: OverpassElement[] = [];
  let okCount = 0;
  let lastErr: unknown = null;
  for (const group of groups) {
    try {
      const query = buildOverpassQuery(group, lat, lng, radiusM);
      const elements = await execQueryWithRetry(query, contactEmail, 2);
      merged.push(...elements);
      okCount++;
    } catch (e) {
      lastErr = e;
      // gruppo fallito: continuiamo con gli altri, cosi salviamo il salvabile
    }
  }

  if (okCount === 0) {
    const detail =
      lastErr instanceof Error && lastErr.message ? " Dettaglio tecnico: " + lastErr.message : "";
    throw new Error(
      "Il servizio gratuito OpenStreetMap (Overpass) e momentaneamente sovraccarico o irraggiungibile. " +
        "Riprova tra 1-2 minuti, oppure seleziona meno categorie o riduci il raggio di ricerca." +
        detail
    );
  }
  return parseElements(merged);
}

function parseElements(elements: OverpassElement[]): OsmCandidate[] {
  const seen = new Set<string>();
  const out: OsmCandidate[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags["name"];
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;

    const osmId = `${el.type}/${el.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);

    const cat = matchCategory(tags);
    const website = firstTag(tags, [
      "website",
      "contact:website",
      "url",
      "website:official",
      "official_website",
      "contact:url",
      "brand:website",
      "website:menu",
    ]);
    const instagram = firstTag(tags, ["contact:instagram", "instagram"]);
    const facebook = firstTag(tags, ["contact:facebook", "facebook"]);
    const tiktok = firstTag(tags, ["contact:tiktok", "tiktok"]);
    const phone = firstTag(tags, ["phone", "contact:phone", "contact:mobile", "mobile"]);

    out.push({
      osmId,
      name,
      category: cat?.id ?? "altro",
      categoryLabel: cat?.label ?? "Altro",
      lat,
      lng,
      addressFull: buildAddress(tags),
      city: tags["addr:city"],
      postalCode: tags["addr:postcode"],
      phone,
      whatsapp: normalizePhone(phone),
      email: firstTag(tags, ["email", "contact:email"]),
      website,
      instagram,
      facebook,
      tiktok,
      hasWebsite: Boolean(website),
      hasSocial: Boolean(instagram || facebook || tiktok),
    });
  }

  return out;
}
