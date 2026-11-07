// ============================================================
// Ricerca GRATUITA del sito ufficiale di un'attivita tramite DuckDuckGo.
// Non richiede alcuna API key: usata come metodo principale/di riserva
// quando Gemini non e disponibile o ha esaurito la quota gratuita.
// Solo lato server.
// ============================================================

// Domini da NON considerare come sito ufficiale (portali, social, marketplace).
const BLOCKED_HOSTS = [
  "facebook.", "instagram.", "tiktok.", "linkedin.", "twitter.", "x.com",
  "youtube.", "youtu.be", "tripadvisor.", "thefork.", "justeat.", "deliveroo.",
  "ubereats.", "glovoapp.", "booking.", "airbnb.", "expedia.", "yelp.",
  "paginegialle.", "paginebianche.", "virgilio.", "misterimprese.", "cylex",
  "europages.", "wikipedia.", "wikimedia.", "google.", "goo.gl", "g.page",
  "g.co", "maps.app", "bing.", "duckduckgo.", "amazon.", "ebay.", "subito.",
  "kijiji.", "trovaprezzi.", "trustpilot.", "foursquare.", "2spaghi.",
  "prontopro.", "houzz.", "pinterest.", "wa.me", "whatsapp.", "t.me",
  // Directory e marketplace che non sono il sito ufficiale dell'attivita.
  "reteimprese.", "firmania.", "informazione-aziende.", "bepizzeria.",
  "ricambicamper.", "paginegialle.it", "paginebianche.it",
];

// Parole che descrivono la categoria, non il nome: da sole non bastano per
// dire che un dominio appartiene all'attivita. Senza questo filtro un
// risultato come "ricambicamper.it" veniva accettato perche' contiene
// "camper", anche se non ha niente a che vedere con l'officina cercata.
const GENERIC_TOKENS = new Set([
  "auto", "autofficina", "officina", "camper", "service", "carrozzeria",
  "autolavaggio", "azienda", "agricola", "studio", "estetica", "pizzeria",
  "macelleria", "ristorante", "trattoria", "bar", "caffe", "hotel", "beb",
  "affittacamere", "agriturismo", "panetteria", "gelateria", "parrucchiere",
  "barbiere", "centro", "benessere", "spa", "palestra", "negozio", "market",
  "supermarket", "gomme", "mediterraneo", "feltrino", "dental", "dentale",
]);

export type HeuristicResult = {
  website: string | null;
  confidence: "alta" | "media" | "bassa";
  note: string;
  candidates: string[];
};

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlocked(host: string): boolean {
  if (!host || !host.includes(".")) return true;
  return BLOCKED_HOSTS.some((b) => host.includes(b));
}

// I risultati DuckDuckGo HTML hanno link del tipo:
//   //duckduckgo.com/l/?uddg=<url-encoded>&rut=...
function decodeDdg(href: string): string | null {
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(href)) return href;
  return null;
}

function normalizedTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 4);
}

/** I token del nome che possono identificare davvero un dominio. */
export function distinctiveNameTokens(name: string): string[] {
  return normalizedTokens(name).filter((t) => !GENERIC_TOKENS.has(t));
}

/**
 * Sceglie un candidato solo se il dominio contiene un token distintivo del
 * nome. Un candidato generico viene restituito come `null`: meglio lasciare
 * il dato da verificare che attribuire all'attivita il sito di un'altra.
 */
export function pickWebsiteCandidate(
  name: string,
  urls: string[],
): { website: string | null; confidence: "alta" | "media"; note: string; candidates: string[] } {
  const tokens = distinctiveNameTokens(name);
  let best: string | null = null;
  let bestScore = 0;

  for (const url of urls) {
    const host = hostOf(url);
    if (isBlocked(host)) continue;
    let score = 0;
    for (const token of tokens) if (host.includes(token)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = url;
    }
  }

  if (!best || tokens.length === 0) {
    return {
      website: null,
      confidence: "media",
      note: "Nessun sito ufficiale evidente trovato (solo portali, directory o domini non coerenti).",
      candidates: urls,
    };
  }

  return {
    website: best,
    confidence: "alta",
    note: "Trovato un dominio coerente con il nome dell'attivita (verifica comunque che sia ufficiale).",
    candidates: urls,
  };
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      signal: controller.signal,
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Il dominio trovato parla davvero di questa attivita? Il solo nome non basta:
 * un omonimo in un'altra citta' non e' il sito del lead. La conferma accetta
 * la citta' nell'URL o nella pagina, oppure il telefono/indirizzo nella pagina.
 * Se non c'e' nessun riscontro, il dominio non viene salvato.
 */
export function websiteMatchesLead(
  input: { url: string; city?: string | null; phone?: string | null; addressFull?: string | null },
  html: string,
): boolean {
  const raw = html || "";
  const url = normalizeText(input.url);
  const text = normalizeText(raw);
  const city = normalizeText(input.city || "");
  if (city.length >= 3 && (url.includes(city) || text.includes(city))) return true;

  const digits = (input.phone || "").replace(/\D/g, "");
  const phoneTail = digits.slice(-7);
  // Il numero puo' stare in un attributo (href="tel:..."), che la
  // normalizzazione dei tag rimuove: per il telefono si guarda l'HTML grezzo.
  if (phoneTail.length >= 7 && raw.replace(/\D/g, "").includes(phoneTail)) return true;

  const street = normalizeText((input.addressFull || "").split(",")[0]);
  if (street.length >= 5 && text.includes(street)) return true;

  return false;
}

/** Scarica la pagina del candidato e la confronta con i dati reali del lead. */
export async function confirmWebsiteForLead(
  website: string,
  lead: { city?: string | null; phone?: string | null; mobile?: string | null; addressFull?: string | null },
): Promise<boolean> {
  const html = await fetchText(website, 12000);
  return websiteMatchesLead(
    { url: website, city: lead.city, phone: lead.phone || lead.mobile, addressFull: lead.addressFull },
    html,
  );
}

export async function findWebsiteHeuristic(
  name: string,
  city: string,
  category: string,
): Promise<HeuristicResult> {
  const q = [name, city, category].filter(Boolean).join(" ");
  const query = encodeURIComponent(q + " sito ufficiale");

  // Prima la versione HTML, poi la "lite" come riserva.
  let html = await fetchText("https://html.duckduckgo.com/html/?q=" + query, 12000);
  if (!html) html = await fetchText("https://lite.duckduckgo.com/lite/?q=" + query, 12000);
  if (!html) {
    return {
      website: null,
      confidence: "bassa",
      note: "Ricerca web non disponibile al momento (riprova tra poco).",
      candidates: [],
    };
  }

  const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1]);
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const h of hrefs) {
    const u = decodeDdg(h);
    if (!u) continue;
    const host = hostOf(u);
    if (isBlocked(host)) continue;
    if (seen.has(host)) continue;
    seen.add(host);
    urls.push("https://" + host);
    if (urls.length >= 6) break;
  }

  if (urls.length === 0) {
    return {
      website: null,
      confidence: "media",
      note: "Nessun sito ufficiale evidente trovato (solo portali o social).",
      candidates: [],
    };
  }

  // Scelgo solo un dominio che contiene un token distintivo del nome.
  return pickWebsiteCandidate(name, urls);
}
