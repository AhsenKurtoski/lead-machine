// ============================================================
// Verifica dei dati di un'attivita (Fase 3).
//
// Regole PURE: nessuna rete, nessun database. Ricevono i dati grezzi
// (e, quando serve, l'esito di una verifica esterna gia eseguita) e
// restituiscono un esito con FONTE e SPIEGAZIONE. Cosi un dato non e
// mai presentato come "verificato" senza una ragione verificabile.
// ============================================================

import { normalizePhone } from "./overpass";

export type VerificationField = "phone" | "email" | "website" | "address" | "social";

export type VerificationStatus =
  | "verificato"
  | "da_verificare"
  | "non_raggiungibile"
  | "non_valido"
  | "assente";

export type VerificationResult = {
  field: VerificationField;
  status: VerificationStatus;
  source: string;
  evidence: string;
};

/** Esito salvato nel database: come sopra, piu quando e stato controllato. */
export type StoredVerification = VerificationResult & { checkedAt: string };

/**
 * Fotografia pronta per il salvataggio: `checkedAt` e' la data della verifica
 * precedente quando l'esito viene conservato, altrimenti `null` e il runner
 * usa l'ora del controllo appena eseguito.
 */
export type VerificationSnapshot = VerificationResult & { checkedAt: Date | null };

/** Fonte dei dati di base: OpenStreetMap (o inserimento manuale). */
export const SOURCE_OSM = "openstreetmap";
/** Verifica eseguita adesso dall'app (controllo diretto). */
export const SOURCE_DIRECT = "controllo_diretto";
/** Verifica emersa da una ricerca web. */
export const SOURCE_WEB = "ricerca_web";

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  return DISPOSABLE_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));
}

// ------------------------------------------------------------
// Email: dall'errore DNS al verdetto (e non il contrario)
// ------------------------------------------------------------

/** Risposte definitive del DNS: il dominio non esiste o non ha record MX. */
const MX_ABSENT_CODES = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN", "NOTFOUND"]);

/**
 * Interpreta l'errore di una risoluzione MX.
 *
 * Un errore di rete (ECONNREFUSED, ETIMEOUT, EAI_AGAIN, SERVFAIL...) significa
 * che il controllo NON e' stato eseguito: in quel caso non si sa nulla del
 * dominio, quindi si torna `null` (il dato resta "da verificare") invece di
 * farlo sembrare un dominio che non riceve email. Solo le risposte definitive
 * del DNS valgono `{ hasMx: false }`.
 */
export function mxVerdictFromError(code: string | null | undefined): { hasMx: boolean } | null {
  const c = (code ?? "").trim().toUpperCase();
  return MX_ABSENT_CODES.has(c) ? { hasMx: false } : null;
}

// ------------------------------------------------------------
// Email: sintassi + dominio raggiungibile (MX passato dal chiamante)
// ------------------------------------------------------------

export function checkEmail(
  raw: string | null | undefined,
  mx?: { hasMx: boolean } | null
): VerificationResult {
  const email = (raw ?? "").trim();
  if (!email) {
    return { field: "email", status: "assente", source: SOURCE_OSM, evidence: "Nessuna email in archivio." };
  }
  if (!EMAIL_RE.test(email)) {
    return { field: "email", status: "non_valido", source: SOURCE_OSM, evidence: "Indirizzo email non valido." };
  }
  if (isDisposableEmail(email)) {
    return {
      field: "email",
      status: "non_valido",
      source: SOURCE_DIRECT,
      evidence: "Dominio email temporaneo: non affidabile.",
    };
  }
  if (mx == null) {
    return {
      field: "email",
      status: "da_verificare",
      source: SOURCE_OSM,
      evidence: "Formato corretto, dominio non ancora verificato.",
    };
  }
  if (!mx.hasMx) {
    return {
      field: "email",
      status: "non_raggiungibile",
      source: SOURCE_DIRECT,
      evidence: "Il dominio non riceve email (nessun record MX).",
    };
  }
  return {
    field: "email",
    status: "verificato",
    source: SOURCE_DIRECT,
    evidence: "Dominio email attivo (record MX presente).",
  };
}

// ------------------------------------------------------------
// Telefono: formato, tipo di numero e canale WhatsApp
// ------------------------------------------------------------

export function phoneKind(normalized: string | null | undefined): "mobile" | "fisso" | "sconosciuto" {
  const n = (normalized ?? "").replace(/[^0-9]/g, "");
  if (!n) return "sconosciuto";
  // Prefisso internazionale italiano: i cellulari iniziano per 39 + 3.
  if (/^39[3]/.test(n)) return "mobile";
  if (/^39[0-9]/.test(n)) return "fisso";
  if (n.startsWith("3")) return "mobile";
  return "sconosciuto";
}

export function checkPhone(input: {
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
}): VerificationResult {
  const raw = (input.whatsapp || input.mobile || input.phone || "").trim();
  if (!raw) {
    return { field: "phone", status: "assente", source: SOURCE_OSM, evidence: "Nessun telefono in archivio." };
  }

  const normalized = normalizePhone(raw);
  const digits = (normalized ?? "").replace(/[^0-9]/g, "");
  if (!normalized || digits.length < 8 || digits.length > 15) {
    return {
      field: "phone",
      status: "non_valido",
      source: SOURCE_DIRECT,
      evidence: "Numero con lunghezza non plausibile (" + digits.length + " cifre).",
    };
  }

  const kind = phoneKind(normalized);
  const kindLabel = kind === "mobile" ? "cellulare" : kind === "fisso" ? "fisso" : "tipo incerto";

  if ((input.whatsapp ?? "").trim()) {
    return {
      field: "phone",
      status: "da_verificare",
      source: SOURCE_OSM,
      evidence:
        "Numero WhatsApp presente in archivio (" +
        kindLabel +
        "): non e stato verificato con WhatsApp, quindi non lo dichiariamo confermato.",
    };
  }

  return {
    field: "phone",
    status: "da_verificare",
    source: SOURCE_OSM,
    evidence: "Formato valido (" + kindLabel + "), raggiungibilita non ancora confermata.",
  };
}

// ------------------------------------------------------------
// Sito web
// ------------------------------------------------------------

export function checkWebsiteField(
  lead: { website?: string | null },
  http: { reachable: boolean; httpStatus?: number | null } | null | undefined,
  searched = false
): VerificationResult {
  const url = (lead.website ?? "").trim();

  if (url) {
    if (http == null) {
      return {
        field: "website",
        status: "da_verificare",
        source: SOURCE_OSM,
        evidence: "Sito indicato ma non ancora controllato.",
      };
    }
    if (http.reachable) {
      return {
        field: "website",
        status: "verificato",
        source: SOURCE_DIRECT,
        evidence: "Il sito risponde correttamente.",
      };
    }
    // Se il server ha risposto con un errore, lo diciamo: "non risponde" e'
    // un'altra cosa (nessuna risposta affatto).
    const httpStatus = http.httpStatus;
    if (typeof httpStatus === "number" && Number.isFinite(httpStatus) && httpStatus > 0) {
      return {
        field: "website",
        status: "non_raggiungibile",
        source: SOURCE_DIRECT,
        evidence:
          "Il sito risponde con errore HTTP " + httpStatus + ": opportunita di intervento urgente.",
      };
    }
    // Nessuna risposta affatto (nessuno stato HTTP): la richiesta non e'
    // riuscita, e non sappiamo se il problema e' il sito o la nostra rete.
    // Quindi non e' un verdetto sul sito: il dato resta da verificare e la
    // coda dei rinvii lo riprova (verify-queue.ts).
    return {
      field: "website",
      status: "da_verificare",
      source: SOURCE_DIRECT,
      evidence:
        "Nessuna risposta dal sito: non e' ancora stabilito se il sito e' giu' o se la richiesta non e' riuscita.",
    };
  }

  if (searched) {
    return {
      field: "website",
      status: "verificato",
      source: SOURCE_WEB,
      evidence: "Nessun sito trovato: l'attivita non ha presenza web.",
    };
  }

  return {
    field: "website",
    status: "da_verificare",
    source: SOURCE_OSM,
    evidence: "Nessun sito in archivio: da confermare con una ricerca.",
  };
}

// ------------------------------------------------------------
// Indirizzo e posizione
// ------------------------------------------------------------

export function checkAddress(input: {
  addressFull?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** true solo se un geocoder ha confermato che le coordinate appartengono all'indirizzo. */
  geocoded?: boolean;
}): VerificationResult {
  const address = (input.addressFull ?? "").trim();
  const city = (input.city ?? "").trim();
  const hasCoords = Number.isFinite(input.lat) && Number.isFinite(input.lng);

  if (!address && !city && !hasCoords) {
    return {
      field: "address",
      status: "assente",
      source: SOURCE_OSM,
      evidence: "Nessun indirizzo ne posizione.",
    };
  }
  if (address && city && hasCoords && input.geocoded) {
    return {
      field: "address",
      status: "verificato",
      source: SOURCE_DIRECT,
      evidence: "Indirizzo, citta e coordinate confermati dal geocoder.",
    };
  }
  if (address && city && hasCoords) {
    return {
      field: "address",
      status: "da_verificare",
      source: SOURCE_OSM,
      evidence: "Indirizzo, citta e coordinate presenti, ma la coerenza non e stata verificata.",
    };
  }
  if (city && hasCoords) {
    return {
      field: "address",
      status: "da_verificare",
      source: SOURCE_OSM,
      evidence: "Citta e coordinate presenti (indirizzo civico non disponibile): verifica sulla mappa.",
    };
  }
  return {
    field: "address",
    status: "da_verificare",
    source: SOURCE_OSM,
    evidence: "Dati di posizione incompleti: verifica su mappa prima di contattare.",
  };
}

// ------------------------------------------------------------
// Social
// ------------------------------------------------------------

export function checkSocial(input: {
  hasSocial?: boolean | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
}): VerificationResult {
  const profiles = [input.instagram, input.facebook, input.tiktok]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);

  if (profiles.length > 0) {
    return {
      field: "social",
      status: "da_verificare",
      source: SOURCE_OSM,
      evidence:
        "Link social presente (" +
        profiles.length +
        "): il profilo non e stato aperto ne verificato, quindi resta da controllare.",
    };
  }
  if (input.hasSocial) {
    return {
      field: "social",
      status: "da_verificare",
      source: SOURCE_OSM,
      evidence: "Segnalato un social ma senza link salvato.",
    };
  }
  return {
    field: "social",
    status: "assente",
    source: SOURCE_OSM,
    evidence: "Nessun social collegato.",
  };
}

// ------------------------------------------------------------
// Sintesi e duplicati
// ------------------------------------------------------------

export type VerificationSummary = {
  total: number;
  verified: number;
  pending: number;
  problems: number;
  overall: "verificato" | "da_verificare" | "attenzione";
  label: string;
};

/**
 * Un controllo live puo' solo confermare o smentire email e sito. Telefono e
 * indirizzo, invece, non hanno un controllo esterno: il runner li rimette
 * "da verificare" perche' non li ha misurati, ma questo non cancella una
 * verifica manuale gia' fatta. Conserviamo quella fotografia (con la sua data)
 * finche' un nuovo esito definitivo non la sostituisce. Se il dato viene
 * modificato, la PATCH del lead elimina la vecchia verifica.
 */
export function preserveManualVerifications(
  current: VerificationResult[],
  previous: Array<VerificationResult & { checkedAt: Date | string }>
): VerificationSnapshot[] {
  const previousByField = new Map(previous.map((row) => [row.field, row]));
  const manualFields = new Set<VerificationField>(["phone", "address"]);

  return current.map((row) => {
    const old = previousByField.get(row.field);
    if (old && manualFields.has(row.field) && row.status === "da_verificare" && old.status === "verificato") {
      return { ...old, checkedAt: new Date(old.checkedAt) };
    }
    return { ...row, checkedAt: null };
  });
}

export function summarizeVerification(results: VerificationResult[]): VerificationSummary {
  const verified = results.filter((r) => r.status === "verificato").length;
  const pending = results.filter((r) => r.status === "da_verificare").length;
  const problems = results.filter(
    (r) => r.status === "non_valido" || r.status === "non_raggiungibile"
  ).length;

  let overall: VerificationSummary["overall"] = "da_verificare";
  if (problems > 0) overall = "attenzione";
  else if (pending === 0 && verified > 0) overall = "verificato";

  const label =
    overall === "verificato"
      ? "Dati verificati"
      : overall === "attenzione"
        ? "Da controllare"
        : "Da verificare";

  return { total: results.length, verified, pending, problems, overall, label };
}

function normName(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Doppioni probabili: stessa attivita per nome+citta.
 * Il terzo livello (fuzzy) e volutamente conservativo: nome identico e
 * citta identica, cosi non uniamo attivita diverse.
 */
export function findDuplicateGroups(
  leads: { id: string; name: string; city?: string | null; osmId?: string | null }[]
): { key: string; leads: { id: string; name: string }[] }[] {
  const groups = new Map<string, { id: string; name: string }[]>();

  for (const lead of leads) {
    const name = normName(lead.name);
    if (!name) continue;
    const key = name + "@" + normName(lead.city);
    const list = groups.get(key) ?? [];
    list.push({ id: lead.id, name: lead.name });
    groups.set(key, list);
  }

  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, leads: list }))
    .sort((a, b) => b.leads.length - a.leads.length);
}

/** Esegue tutti i controlli "a tavolino" (senza rete) su un lead. */
export function verifyLeadOffline(
  lead: {
    phone?: string | null;
    mobile?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    addressFull?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    hasSocial?: boolean | null;
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
  }
): VerificationResult[] {
  return [
    checkPhone({ phone: lead.phone, mobile: lead.mobile, whatsapp: lead.whatsapp }),
    checkEmail(lead.email, null),
    checkWebsiteField(lead, null, false),
    checkAddress({
      addressFull: lead.addressFull,
      city: lead.city,
      lat: lead.lat,
      lng: lead.lng,
      geocoded: false,
    }),
    checkSocial({
      hasSocial: lead.hasSocial,
      instagram: lead.instagram,
      facebook: lead.facebook,
      tiktok: lead.tiktok,
    }),
  ];
}

export const VERIFICATION_FIELD_LABELS: Record<VerificationField, string> = {
  phone: "Telefono",
  email: "Email",
  website: "Sito web",
  address: "Indirizzo",
  social: "Social",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  verificato: "Verificato",
  da_verificare: "Da verificare",
  non_raggiungibile: "Non raggiungibile",
  non_valido: "Non valido",
  assente: "Assente",
};
