// ============================================================
// Contatto e User-Agent per i servizi OpenStreetMap (Overpass, Nominatim).
//
// Non sono chiavi API: sono solo le informazioni che la policy OSM chiede di
// mandare per identificare chi fa le richieste. Sbagliarle ha un effetto
// concreto: Nominatim risponde 403 "Access denied" a qualsiasi User-Agent che
// contenga un indirizzo segnaposto (es. anonimo@example.com) e il geocoding
// smette di funzionare per TUTTE le citta'.
//
// Qui l'User-Agent e' sempre accettabile perche' contiene l'URL del progetto,
// e l'email dell'utente viene aggiunta solo se e' un indirizzo reale.
// ============================================================

export const PROJECT_URL = "https://github.com/AhsenKurtoski/lead-machine";
const APP = "LeadMachine/1.0";

/**
 * Vero solo per un'email reale: gli indirizzi di documentazione
 * (example.com, esempio.it, test.*, localhost...) sono rifiutati da Nominatim,
 * quindi non vanno mai messi nell'User-Agent.
 */
export function isRealContactEmail(value: unknown): boolean {
  const s = typeof value === "string" ? value.trim() : "";
  const m = /^([^\s@]+)@([^\s@]+\.[^\s@]{2,})$/.exec(s);
  if (!m) return false;

  const local = m[1].toLowerCase();
  const domain = m[2].toLowerCase();

  if (domain === "example.com" || domain === "example.org" || domain === "example.net") return false;
  if (domain === "localhost" || domain.endsWith(".localhost")) return false;
  if (domain.startsWith("example.") || domain.startsWith("esempio.")) return false;
  if (/^(test|invalid|example|esempio)\./.test(domain)) return false;
  // Suffissi riservati (RFC 2606/6761) e reti private: non sono indirizzi veri.
  const tld = domain.split(".").pop() ?? "";
  if (["local", "localhost", "test", "invalid", "example", "internal", "lan", "home"].includes(tld)) return false;
  if (["anonimo", "anonymous", "noreply", "no-reply", "donotreply"].includes(local)) return false;

  return true;
}

/** Email di contatto valida presa dall'ambiente, altrimenti null. */
export function osmContactEmail(env: Record<string, string | undefined> = process.env): string | null {
  const raw = (env.OSM_CONTACT_EMAIL ?? "").trim();
  return isRealContactEmail(raw) ? raw : null;
}

/**
 * User-Agent per Overpass e Nominatim. Con un contatto reale lo include
 * (policy OSM), altrimenti manda l'URL del progetto: in entrambi i casi resta
 * un identificativo valido, mai un'email segnaposto.
 */
export function userAgentFor(contact?: string | null): string {
  return isRealContactEmail(contact)
    ? APP + " (" + String(contact).trim() + ")"
    : APP + " (+" + PROJECT_URL + ")";
}

/** User-Agent da usare quando non si ha un contatto a portata di mano. */
export function osmUserAgent(env: Record<string, string | undefined> = process.env): string {
  return userAgentFor(osmContactEmail(env));
}

/**
 * Aggiunge `email=` all'URL quando c'e' un contatto reale (Nominatim lo
 * consiglia per un uso intenso). Senza contatto, o se il parametro c'e' gia',
 * restituisce l'URL cosi com'e'.
 */
export function osmUrlWithContact(
  url: string,
  env: Record<string, string | undefined> = process.env
): string {
  const contact = osmContactEmail(env);
  if (!contact) return url;
  if (/[?&]email=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "email=" + encodeURIComponent(contact);
}
