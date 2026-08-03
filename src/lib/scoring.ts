import type { OsmCandidate } from "./overpass";

export type ScoreResult = {
  score: number; // 0-100
  reason: string;
  websiteStatus: string;
};

type ScoreInput = {
  hasWebsite: boolean;
  hasSocial: boolean;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  websiteStatus?: string | null;
  googleRating?: number | null;
  googleReviews?: number | null;
};

// ============================================================
// Punteggio di priorita (0-100): piu alto = ha PIU bisogno di me.
// Obiettivo: individuare chirurgicamente chi ha bisogno URGENTE di un sito
// nuovo o di un restyling, e dare priorita a chi e gia un'attivita avviata
// (tante recensioni / buona reputazione) ma invisibile o mal posizionata online.
// ============================================================
export function computeScore(c: ScoreInput): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const status = (c.websiteStatus || "").toLowerCase();
  const siteOffline =
    status === "offline" || status === "errore" || status === "non_raggiungibile";
  const siteOld = status === "datato" || status === "vecchio" || status === "da_rifare";
  const hasSite = Boolean(c.hasWebsite || c.website);

  // --- 1) BISOGNO PRIMARIO: il sito web (peso massimo) ---
  if (!hasSite) {
    score += 55;
    reasons.push("nessun sito web (opportunita: nuovo sito)");
  } else if (siteOffline) {
    score += 60;
    reasons.push("sito non raggiungibile (intervento urgente)");
  } else if (siteOld) {
    score += 45;
    reasons.push("sito datato (opportunita: restyling)");
  } else {
    score += 10;
    reasons.push("ha un sito (valutare restyling/SEO)");
  }

  // --- 2) Presenza social ---
  if (!c.hasSocial) {
    score += 15;
    reasons.push("nessun social attivo");
  }

  // --- 3) Popolarita = valore commerciale del lead ---
  // Un'attivita molto frequentata ma senza/con poco web e un cliente ideale.
  const reviews = Number(c.googleReviews) || 0;
  const rating = Number(c.googleRating) || 0;
  if (reviews >= 50) {
    score += 12;
    reasons.push("molto frequentata (" + reviews + " recensioni)");
  } else if (reviews >= 15) {
    score += 8;
    reasons.push("buona affluenza (" + reviews + " recensioni)");
  } else if (reviews > 0) {
    score += 4;
  }
  if (rating >= 4.3 && reviews >= 10) {
    score += 5;
    reasons.push("ottima reputazione (" + rating.toFixed(1) + " stelle)");
  }

  // --- 4) Contattabilita = quanto e azionabile subito ---
  if (c.phone || c.whatsapp) {
    score += 8;
    reasons.push("contattabile (telefono/WhatsApp)");
  }
  if (c.email) {
    score += 5;
    reasons.push("email disponibile");
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  // In fase di sola ricerca OSM non conferma l'assenza del sito: lo stato resta
  // "da_verificare" finche la verifica attiva non determina lo stato reale.
  const websiteStatus = c.websiteStatus || "da_verificare";
  return { score: Math.round(score), reason: reasons.join(" + "), websiteStatus };
}

export function scoreCandidate(c: OsmCandidate): ScoreResult {
  return computeScore(c);
}
