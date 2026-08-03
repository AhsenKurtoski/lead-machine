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
];

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

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 4);
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

  // Scelgo il dominio che assomiglia di piu al nome dell'attivita.
  const tokens = nameTokens(name);
  let best = urls[0];
  let bestScore = -1;
  for (const u of urls) {
    const host = hostOf(u);
    let score = 0;
    for (const t of tokens) if (host.includes(t)) score += 2;
    if (host.endsWith(".it")) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = u;
    }
  }

  const confidence: "alta" | "media" | "bassa" = bestScore >= 2 ? "alta" : "media";
  const note =
    confidence === "alta"
      ? "Trovato un dominio coerente con il nome dell'attivita (verifica comunque che sia ufficiale)."
      : "Trovato un possibile sito: controlla che sia il dominio ufficiale dell'attivita.";

  return { website: best, confidence, note, candidates: urls };
}
