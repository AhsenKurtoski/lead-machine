// ============================================================
// Coda dei controlli da riprovare — regole PURE.
//
// Un controllo che non si e' potuto fare per un problema di rete (il resolver
// DNS non risponde, il sito non da' nessuna risposta) NON e' un verdetto: il
// dato resta "da verificare" e va riprovato piu' tardi. Qui ci sono le regole
// del rinvio — quante volte, con quali attese e come si scrive all'utente —
// senza rete e senza database, cosi' si verificano con i test.
//
// Il primo tentativo lo fa l'utente ("Verifica ora") o la verifica in blocco;
// i successivi li fa la coda: `runDueVerifications` in verify-runner.ts.
// ============================================================

/** Campi il cui esito dipende da un controllo esterno (e quindi puo' fallire). */
export const RETRY_FIELDS = ["email", "website"] as const;
export type RetryField = (typeof RETRY_FIELDS)[number];

/** Tentativi massimi: dopo questo il dato resta "da verificare", senza insistere. */
export const RETRY_MAX_ATTEMPTS = 5;

/** Prima attesa: 5 minuti. */
export const RETRY_BASE_DELAY_MS = 5 * 60_000;

/** Tetto dell'attesa: 6 ore (nessun rinvio oltre). */
export const RETRY_MAX_DELAY_MS = 6 * 3_600_000;

/** Perche' un controllo e' stato rinviato (testo leggibile, finisce nel database). */
export const RETRY_REASON = {
  /** Il dominio email non e' stato verificato: il resolver DNS non ha risposto. */
  dns: "il resolver DNS non ha risposto",
  /** Il sito non ha dato nessuna risposta (errore di rete o tempo scaduto). */
  network: "il sito non ha dato nessuna risposta",
} as const;

export type RetryPlan =
  | { retry: false; attempts: number; nextAttemptAt: null; note: string }
  | { retry: true; attempts: number; nextAttemptAt: Date; note: string };

/**
 * Attesa prima del prossimo tentativo: cresce col numero di tentativi gia'
 * fatti (5 min, 10, 20, 40...) e si ferma al tetto.
 * `attempts` = tentativi gia' fatti, compreso quello appena concluso.
 */
export function retryDelayMs(attempts: number): number {
  const n = Number.isFinite(attempts) ? Math.max(1, Math.floor(attempts)) : 1;
  const delay = RETRY_BASE_DELAY_MS * Math.pow(2, n - 1);
  return Math.min(delay, RETRY_MAX_DELAY_MS);
}

/** Attesa in parole: "5 minuti", "1 ora", "2 ore". */
export function describeDelay(ms: number): string {
  const minutes = Math.max(1, Math.round((Number.isFinite(ms) ? ms : 0) / 60_000));
  if (minutes < 60) return minutes + (minutes === 1 ? " minuto" : " minuti");
  const hours = Math.max(1, Math.round(minutes / 60));
  return hours + (hours === 1 ? " ora" : " ore");
}

/**
 * Decide cosa fare di un controllo che non e' riuscito.
 * Restituisce sempre una spiegazione in chiaro: se si riprova, quando e con
 * quale tentativo; se si smette, perche' (senza far credere a un verdetto).
 */
export function planRetry(input: {
  /** Tentativi gia' fatti, compreso quello appena concluso. */
  attempts: number;
  reason: string;
  now?: Date;
}): RetryPlan {
  const now = input.now ?? new Date();
  const attempts = Number.isFinite(input.attempts) ? Math.max(1, Math.floor(input.attempts)) : 1;
  const reason = (input.reason ?? "").trim() || "controllo non riuscito";

  if (attempts >= RETRY_MAX_ATTEMPTS) {
    return {
      retry: false,
      attempts,
      nextAttemptAt: null,
      note:
        "Controllo rinviato " +
        attempts +
        " volte senza riuscire (" +
        reason +
        "): il dato resta da verificare, senza altre riprove automatiche.",
    };
  }

  const delay = retryDelayMs(attempts);
  return {
    retry: true,
    attempts,
    nextAttemptAt: new Date(now.getTime() + delay),
    note:
      "Controllo non riuscito (" +
      reason +
      "): lo riprovo tra " +
      describeDelay(delay) +
      " (tentativo " +
      (attempts + 1) +
      " di " +
      RETRY_MAX_ATTEMPTS +
      ").",
  };
}

/**
 * Aggiunge alla spiegazione del campo la nota sul rinvio, senza duplicare
 * spazi quando la spiegazione e' vuota.
 */
export function appendRetryNote(evidence: string | null | undefined, note: string): string {
  const base = (evidence ?? "").trim();
  const extra = (note ?? "").trim();
  if (!base) return extra;
  if (!extra) return base;
  return base + " " + extra;
}
