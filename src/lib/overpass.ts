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
// Verificati in produzione (ottobre 2026):
// - overpass-api.de: copertura MONDIALE, risponde in 1-6s con Accept: application/json
//   e User-Agent identificante (risponde 406 agli UA da browser, per questo lo
//   identifichiamo sempre come LeadMachine + contatto).
// - maps.mail.ru: copertura mondiale, spesso 504 ma ogni tanto regge: secondo in lista.
// - overpass.osm.ch: velocissimo (<1s) ma copre SOLO la Svizzera: puo' dichiarare
//   "0 risultati" anche per citta' italiane piene di attivita', quindi non puo'
//   confermare un risultato vuoto (vedi global in execQueryWithRetry).
// Rimossi kumi.systems, private.coffee, osm.jp, openstreetmap.ru: non rispondono piu'.
const OVERPASS_ENDPOINTS: { url: string; global: boolean }[] = [
  { url: "https://overpass-api.de/api/interpreter", global: true },
  { url: "https://maps.mail.ru/osm/tools/overpass/api/interpreter", global: true },
  { url: "https://overpass.osm.ch/api/interpreter", global: false },
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

  // Raggruppiamo i selector per chiave e usiamo un filtro regex sui valori:
  // uno statement spaziale per chiave (non per coppia) e' molto piu' rapido
  // perche' Overpass usa l'indice spaziale una volta sola. Il vincolo (around:)
  // viene PRIMA dei tag: nella forma inversa le query andavano in timeout lato server.
  const valuesByKey = new Map<string, Set<string>>();
  for (const cat of cats) {
    for (const [key, value] of cat.selectors) {
      if (!valuesByKey.has(key)) valuesByKey.set(key, new Set());
      valuesByKey.get(key)!.add(value);
    }
  }

  const lines: string[] = [];
  for (const [key, values] of valuesByKey) {
    const alternation = [...values].map(escapeOverpassRegex).join("|");
    lines.push(
      `  nwr(around:${radiusM},${lat},${lng})["name"]["${escapeOverpassRegex(key)}"~"^(${alternation})$"];`
    );
  }

  return `[out:json][timeout:20];\n(\n${lines.join("\n")}\n);\nout center tags;`;
}

// Escape dei caratteri speciali delle regex Overpass (valori e chiavi dei tag)
function escapeOverpassRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    // Alcuni mirror rispondono 200 con pagine HTML/XML di errore (overload,
    // gateway): non e' un errore della query ma un guasto del mirror, quindi
    // lo classifichiamo come temporaneo e passiamo al mirror successivo.
    const text = await res.text();
    let json: { elements?: OverpassElement[]; remark?: string };
    try {
      json = JSON.parse(text);
    } catch {
      throw new OverpassError("Overpass: risposta non JSON dal mirror", true, res.status);
    }
    // "remark" compare quando il server interrompe la query (es. "runtime error:
    // Query timed out"): i dati restituiti sono assenti o parziali, quindi
    // trattiamo la risposta come errore temporaneo e proviamo gli altri mirror.
    if (json.remark) {
      throw new OverpassError("Overpass: " + json.remark, true, res.status);
    }
    return json.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// Una richiesta Overpass: prova in POST e, se il mirror lo rifiuta o fallisce
// in fretta, riprova in GET. Serve per mirror come maps.mail.ru che rispondono
// 504 al POST ma 200 al GET, e per quelli che accettano solo GET (405/406).
async function fetchOverpass(
  endpoint: string,
  query: string,
  contactEmail: string,
  timeoutMs: number
): Promise<OverpassElement[]> {
  const started = Date.now();
  try {
    return await rawFetch(endpoint, query, contactEmail, timeoutMs, false);
  } catch (err) {
    const status = err instanceof OverpassError ? err.status : 0;
    const methodRejected = status === 405 || status === 406;
    // Fallimento RAPIDO = la richiesta e' stata scartata prima di eseguire la
    // query (metodo rifiutato, gateway): il GET spesso funziona. Se invece il
    // POST ha consumato tutto il timeout il mirror e' sovraccarico e un secondo
    // tentativo non aiuterebbe, quindi risparmiamo il tempo.
    const failedFast = Date.now() - started < 3000 && isTransient(err);
    if (methodRejected || failedFast) {
      return await rawFetch(endpoint, query, contactEmail, timeoutMs, true);
    }
    throw err;
  }
}

// Esegue una query provando piu endpoint in piu giri, con backoff crescente
// sui guasti temporanei (504/timeout). Su errori NON temporanei (es. 400) si ferma subito.
// Ogni tentativo rispetta la deadline: non si inizia una richiesta che non potrebbe
// finire in tempo, cosi il budget del chiamante non viene mai sforato.
async function execQueryWithRetry(
  query: string,
  contactEmail: string,
  rounds = 2,
  deadline = Date.now() + 45_000
): Promise<OverpassElement[]> {
  let lastError: unknown = null;
  for (let round = 0; round < rounds; round++) {
    // Un risultato vuoto "confermato" solo da un mirror con copertura parziale
    // (es. osm.ch = solo Svizzera) non basta: vogliamo l'ok di almeno un mirror
    // con copertura mondiale prima di dichiarare che non ci sono risultati.
    let emptyConfirmedByGlobal = false;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const remaining = deadline - Date.now();
      // Tempo quasi esaurito: meglio fermarsi con un errore chiaro che far
      // scattare il timeout del chiamante in mezzo a una richiesta.
      if (remaining < 3_000) {
        throw lastError ?? new OverpassError("Overpass: tempo di ricerca esaurito", true, 0);
      }
      try {
        const elements = await fetchOverpass(
          endpoint.url,
          query,
          contactEmail,
          Math.min(25_000, remaining - 500)
        );
        if (elements.length > 0) return elements;
        if (endpoint.global) emptyConfirmedByGlobal = true;
      } catch (err) {
        lastError = err;
        if (!isTransient(err)) throw err;
        await sleep(Math.min(700 + round * 1200, Math.max(0, deadline - Date.now() - 3_000)));
      }
    }
    if (emptyConfirmedByGlobal) return [];
  }
  throw lastError ?? new Error("Overpass non raggiungibile");
}

export async function runOverpassSearch(
  categoryIds: string[],
  lat: number,
  lng: number,
  radiusM: number,
  contactEmail: string,
  budgetMs = 45_000
): Promise<OsmCandidate[]> {
  // Deadline interna con margine sul budget del chiamante: rispondiamo con un
  // errore chiaro PRIMA che scatti il suo timeout, senza lasciare richieste a meta'.
  const deadline = Date.now() + Math.max(5_000, budgetMs - 1_500);

  // 1) Tentativo con query unica (tutte le categorie insieme): piu veloce.
  try {
    const query = buildOverpassQuery(categoryIds, lat, lng, radiusM);
    // Un solo giro di mirror per la query completa: se e' troppo pesante per il
    // server, risparmiamo il tempo dei retry e passiamo subito ai gruppi piccoli.
    const elements = await execQueryWithRetry(query, contactEmail, 1, deadline);
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
    if (deadline - Date.now() < 3_000) {
      lastErr = lastErr ?? new OverpassError("Overpass: tempo di ricerca esaurito", true, 0);
      break;
    }
    try {
      const query = buildOverpassQuery(group, lat, lng, radiusM);
      const elements = await execQueryWithRetry(query, contactEmail, 2, deadline);
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
