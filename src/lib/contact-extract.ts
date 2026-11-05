// ============================================================
// Arricchimento contatti: estrazione di email e profili social
// dall'HTML del sito di un'attivita.
//
// Funzioni pure (nessuna rete): la pagina viene scaricata dal
// chiamante, cosi i test girano offline e non inventano dati.
// ============================================================

export type ExtractedContacts = {
  email: string | null;
  instagram: string | null;
  facebook: string | null;
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MAILTO_RE = /mailto:([^"'?>\s]+)/gi;
const INSTAGRAM_RE = /https?:\/\/(?:www\.)?instagram\.com\/[^"'\s<>\\]*/gi;
const FACEBOOK_RE = /https?:\/\/(?:www\.)?facebook\.com\/[^"'\s<>\\]*/gi;

// Caselle che non sono il contatto dell'attivita.
const BLOCKED_LOCAL_PARTS = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "postmaster",
  "abuse",
  "example",
  "test",
  "sentry",
  "wordpress",
  "wix",
];

// Domini di esempio o di servizio: non sono contatti reali.
const BLOCKED_EMAIL_DOMAINS = [
  "example.com",
  "example.org",
  "example.net",
  "domain.com",
  "email.com",
  "yourdomain.com",
  "sito.it",
  "sentry.io",
  "wixpress.com",
];

// Primi segmenti di percorso che non sono il profilo dell'attivita
// (pulsanti di condivisione, widget, post singoli, storie, login).
const BLOCKED_SOCIAL_SEGMENTS = [
  "share",
  "sharer",
  "sharing",
  "plugins",
  "dialog",
  "intent",
  "hashtag",
  "explore",
  "reel",
  "reels",
  "stories",
  "tv",
  "login",
  "p",
  "v2.0",
  "tr",
  "video.php",
  "help",
  "legal",
  "policies",
];

function isBlockedEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return true;
  const local = parts[0].toLowerCase();
  const domain = parts[1].toLowerCase();
  if (!local || !domain) return true;
  if (BLOCKED_LOCAL_PARTS.some((b) => local === b || local.startsWith(b + ".") || local.startsWith(b + "+") || local.endsWith("." + b))) {
    return true;
  }
  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) return true;
  // Nomi di file e asset finiti per errore nel testo.
  if (/\.(png|jpe?g|gif|svg|webp|css|js|json|woff2?)$/i.test(domain)) return true;
  return false;
}

/**
 * Estrae la prima email credibile dall'HTML: prima i link mailto,
 * poi il testo. Ritorna null se non trova nulla di utilizzabile.
 */
export function extractEmailFromHtml(html: string): string | null {
  const text = html || "";
  const candidates: string[] = [];

  for (const m of text.matchAll(MAILTO_RE)) candidates.push(m[1]);
  for (const m of text.matchAll(EMAIL_RE)) candidates.push(m[0]);

  for (const raw of candidates) {
    const email = raw.trim().replace(/^[<("']+/, "").replace(/[.,;:>)'"]+$/, "").toLowerCase();
    if (!email.includes("@")) continue;
    if (isBlockedEmail(email)) continue;
    return email;
  }
  return null;
}

/**
 * Normalizza un link social in un profilo pulito, oppure null se non
 * e il profilo dell'attivita (widget di condivisione, post, login...).
 */
export function socialProfileUrl(raw: string, network: "instagram" | "facebook"): string | null {
  const host = network === "instagram" ? "instagram.com" : "facebook.com";
  let url = (raw || "").trim();
  if (url.startsWith("//")) url = "https:" + url;
  if (!/^https?:\/\//i.test(url)) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname !== host) return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const first = parts[0].toLowerCase();
  // Confronto sul primo segmento intero: "trattoria.rossi" non e la path "/tr".
  if (BLOCKED_SOCIAL_SEGMENTS.includes(first)) return null;

  if (network === "facebook") {
    if (first === "profile.php") {
      const id = parsed.searchParams.get("id");
      return id ? "https://www.facebook.com/profile.php?id=" + encodeURIComponent(id) : null;
    }
    if (first === "pages" && parts.length >= 2) {
      const handle = parts[1];
      return /^[A-Za-z0-9._-]{2,}$/.test(handle) ? "https://www.facebook.com/pages/" + handle : null;
    }
  }

  const handle = parts[0];
  if (!/^[A-Za-z0-9._-]{2,}$/.test(handle)) return null;
  return "https://www." + host + "/" + handle;
}

function firstProfile(html: string, re: RegExp, network: "instagram" | "facebook"): string | null {
  for (const m of html.matchAll(re)) {
    const profile = socialProfileUrl(m[0], network);
    if (profile) return profile;
  }
  return null;
}

/**
 * Estrae email, Instagram e Facebook dall'HTML della pagina.
 * Ogni campo e indipendente: quello che non c'e resta null.
 */
export function extractContactsFromHtml(html: string): ExtractedContacts {
  const text = html || "";
  return {
    email: extractEmailFromHtml(text),
    instagram: firstProfile(text, INSTAGRAM_RE, "instagram"),
    facebook: firstProfile(text, FACEBOOK_RE, "facebook"),
  };
}
