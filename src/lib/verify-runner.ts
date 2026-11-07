// ============================================================
// Runner della verifica dati (solo server).
//
// Unisce le regole pure di `verify.ts` con i controlli REALI che
// richiedono rete (record MX del dominio, risposta HTTP del sito) e
// salva l'esito nel database, cosi ogni dato ha fonte e data.
//
// Un controllo che non si e' potuto fare per un problema di rete non e' un
// verdetto: il campo resta "da verificare" e finisce nella coda dei rinvii
// (modello VerificationRetry, regole in verify-queue.ts), che questo file
// riprocessa quando scade (`runDueVerifications`).
// ============================================================

import { promises as dns } from "node:dns";
import { prisma } from "./prisma";
import { checkWebsite } from "./website-check";
import {
  appendRetryNote,
  planRetry,
  RETRY_REASON,
  type RetryField,
} from "./verify-queue";
import {
  checkAddress,
  checkEmail,
  checkPhone,
  checkSocial,
  checkWebsiteField,
  emailDomain,
  isDisposableEmail,
  mxVerdictFromError,
  preserveManualVerifications,
  summarizeVerification,
  type StoredVerification,
  type VerificationResult,
  type VerificationSummary,
} from "./verify";

export type { StoredVerification };

/**
 * Esito di un controllo MX: `hasMx` e' il verdetto del DNS (`true`/`false`)
 * oppure `null` se il controllo non e' stato eseguito (errore di rete), con
 * l'errore tecnico a parte per la diagnosi.
 */
export type MxLookup = { hasMx: boolean | null; error: string | null };

/**
 * Il dominio riceve email? (record MX).
 * Un errore di rete non diventa un verdetto: in quel caso `hasMx` resta `null`
 * (il dato resta "da verificare") e il campo entra nella coda dei rinvii.
 */
export async function lookupMx(domain: string): Promise<MxLookup> {
  if (!domain || !domain.includes(".")) return { hasMx: null, error: "dominio non valido" };
  try {
    const records = await dns.resolveMx(domain);
    return { hasMx: Array.isArray(records) && records.length > 0, error: null };
  } catch (e) {
    const code = e instanceof Error ? (e as NodeJS.ErrnoException).code ?? e.message : null;
    const verdict = mxVerdictFromError(code);
    return verdict ? { hasMx: verdict.hasMx, error: null } : { hasMx: null, error: code };
  }
}

/** Coda dei controlli rimandati per un lead. */
export type RetryQueueState = {
  /** Controlli rimandati: da riprovare a una certa data. */
  scheduled: Array<{
    field: RetryField;
    attempts: number;
    nextAttemptAt: string;
    reason: string;
    lastError: string | null;
  }>;
  /**
   * Campi usciti dalla coda: "risolto" = non serve piu' riprovare (controllo
   * riuscito o dato assente), "abbandonato" = troppi tentativi falliti.
   */
  cleared: Array<{ field: RetryField; outcome: "risolto" | "abbandonato" }>;
};

export type VerifyOutcome = {
  results: StoredVerification[];
  summary: VerificationSummary;
  queue: RetryQueueState;
};

/** Un campo che questa run non e' riuscita a controllare. */
type VerificationGap = { field: RetryField; reason: string; error: string | null };

/**
 * Verifica tutti i campi di un lead e salva l'esito.
 * Ritorna l'esito completo (con data) per mostrarlo subito in UI.
 */
export async function verifyLead(leadId: string): Promise<VerifyOutcome | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  const gaps: VerificationGap[] = [];

  // 1) Email: controllo reale del dominio (solo se il formato e plausibile).
  const email = (lead.email ?? "").trim();
  let mx: { hasMx: boolean } | null = null;
  if (email && !isDisposableEmail(email) && emailDomain(email).includes(".")) {
    const lookup = await lookupMx(emailDomain(email));
    if (lookup.hasMx === null) {
      // Il resolver non ha risposto: il dato resta da verificare e si riprova.
      gaps.push({ field: "email", reason: RETRY_REASON.dns, error: lookup.error });
    } else {
      mx = { hasMx: lookup.hasMx };
    }
  }

  // 2) Sito: controllo HTTP reale (solo se c'e un URL da controllare).
  const url = (lead.website ?? "").trim();
  let http: { reachable: boolean; httpStatus?: number | null } | null = null;
  let websiteCheck: Awaited<ReturnType<typeof checkWebsite>> | null = null;
  if (url) {
    websiteCheck = await checkWebsite(url);
    http = { reachable: websiteCheck.reachable, httpStatus: websiteCheck.httpStatus };
    // Nessuna risposta affatto: non sappiamo se il sito e' giu' o se siamo noi a
    // non riuscire a raggiungerlo, quindi non lo diamo per irraggiungibile e
    // riproviamo piu' tardi.
    if (!websiteCheck.reachable && websiteCheck.httpStatus === null) {
      gaps.push({ field: "website", reason: RETRY_REASON.network, error: websiteCheck.detail });
    }
  }

  let results: VerificationResult[] = [
    checkPhone({ phone: lead.phone, mobile: lead.mobile, whatsapp: lead.whatsapp }),
    checkEmail(email, mx),
    // Se una ricerca ufficiale ha gia' stabilito che il sito non esiste
    // (`websiteStatus = assente`), il controllo puo' chiudere il campo come
    // verificato: altrimenti resterebbe "da verificare" per sempre.
    checkWebsiteField(
      { website: lead.website },
      http,
      !url && lead.websiteStatus === "assente"
    ),
    checkAddress({
      addressFull: lead.addressFull,
      city: lead.city,
      lat: lead.lat,
      lng: lead.lng,
    }),
    checkSocial({
      hasSocial: lead.hasSocial,
      instagram: lead.instagram,
      facebook: lead.facebook,
      tiktok: lead.tiktok,
    }),
  ];

  const checkedAt = new Date();

  // 3) Coda dei rinvii: si riparte dai tentativi gia' fatti per questo lead.
  //    Insieme alla fotografia precedente, per non cancellare le verifiche
  //    manuali di telefono e indirizzo quando il runner non le ha misurate.
  const [alreadyQueued, previousRows] = await Promise.all([
    prisma.verificationRetry.findMany({
      where: { leadId },
      select: { field: true, attempts: true },
    }),
    prisma.verification.findMany({ where: { leadId } }),
  ]);
  const previousAttempts = new Map(alreadyQueued.map((r) => [r.field, r.attempts]));

  const scheduled: RetryQueueState["scheduled"] = [];
  const cleared: RetryQueueState["cleared"] = [];
  // Operazioni sulla coda, eseguite nella stessa transazione della fotografia.
  const queueOps: Array<
    | ReturnType<typeof prisma.verificationRetry.upsert>
    | ReturnType<typeof prisma.verificationRetry.deleteMany>
  > = [];

  // Set di stringhe: dall'altra parte c'e' `row.field` che arriva dal database.
  const gapFields = new Set<string>(gaps.map((g) => g.field));
  for (const gap of gaps) {
    const attempts = (previousAttempts.get(gap.field) ?? 0) + 1;
    const plan = planRetry({ attempts, reason: gap.reason, now: checkedAt });

    // La spiegazione del campo dice sempre anche che il controllo e' rinviato:
    // cosi "da verificare" non resta un'etichetta senza motivo.
    results = results.map((r) =>
      r.field === gap.field ? { ...r, evidence: appendRetryNote(r.evidence, plan.note) } : r
    );

    if (plan.retry && plan.nextAttemptAt) {
      const nextAttemptAt = plan.nextAttemptAt;
      scheduled.push({
        field: gap.field,
        attempts: plan.attempts,
        nextAttemptAt: nextAttemptAt.toISOString(),
        reason: gap.reason,
        lastError: gap.error,
      });
      queueOps.push(
        prisma.verificationRetry.upsert({
          where: { leadId_field: { leadId, field: gap.field } },
          create: {
            leadId,
            field: gap.field,
            attempts: plan.attempts,
            nextAttemptAt,
            reason: gap.reason,
            lastError: gap.error,
          },
          update: {
            attempts: plan.attempts,
            nextAttemptAt,
            reason: gap.reason,
            lastError: gap.error,
          },
        })
      );
    } else {
      // Troppi tentativi: si smette (il dato resta "da verificare", non si mente).
      cleared.push({ field: gap.field, outcome: "abbandonato" });
      queueOps.push(prisma.verificationRetry.deleteMany({ where: { leadId, field: gap.field } }));
    }
  }

  // I campi che ora hanno un esito definitivo (o non hanno piu' niente da
  // controllare) escono dalla coda.
  for (const row of alreadyQueued) {
    if (gapFields.has(row.field)) continue;
    const field = row.field as RetryField;
    cleared.push({ field, outcome: "risolto" });
    queueOps.push(prisma.verificationRetry.deleteMany({ where: { leadId, field } }));
  }

  // 4) Salvataggio: si sostituisce l'intera fotografia del lead e si aggiorna
  // la coda in UNA sola transazione. E' questo che rende la scrittura atomica:
  // verifiche lanciate in parallelo sullo stesso lead si serializzano e
  // lasciano sempre una riga per campo, mai due (misurato: 4 richieste
  // concorrenti -> 5 righe). Il controllo ripetibile e'
  // `node scripts/probe-verify-concurrency.mjs`; i doppioni nel database li
  // intercetta `npm run check:hygiene`.
  //
  // Telefono e indirizzo non hanno un controllo esterno: se il runner non li
  // misura, conserva la verifica manuale precedente invece di cancellarla.
  const snapshot = preserveManualVerifications(
    results,
    previousRows.map((row) => ({
      field: row.field as VerificationResult["field"],
      status: row.status as VerificationResult["status"],
      source: row.source ?? "",
      evidence: row.evidence ?? "",
      checkedAt: row.checkedAt,
    }))
  );

  await prisma.$transaction([
    prisma.verification.deleteMany({ where: { leadId } }),
    prisma.verification.createMany({
      data: snapshot.map((r) => ({
        leadId,
        field: r.field,
        status: r.status,
        source: r.source,
        evidence: r.evidence,
        checkedAt: r.checkedAt ?? checkedAt,
      })),
    }),
    ...queueOps,
  ]);

  // 5) Il lead riflette cio che abbiamo appena misurato. Se il sito non ha
  // dato nessuna risposta il controllo non e' riuscito: il campo del sito non
  // viene marcato "non raggiungibile" (dichiarazione che non possiamo fare),
  // ma resta "da verificare" come il dato nell'elenco della verifica.
  if (websiteCheck) {
    const noResponse = !websiteCheck.reachable && websiteCheck.httpStatus === null;
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        websiteStatus: noResponse ? "da_verificare" : websiteCheck.status,
        hasWebsite: websiteCheck.status !== "assente" && Boolean(url),
      },
    });
  }

  const summary = summarizeVerification(snapshot);

  await prisma.activity.create({
    data: {
      leadId,
      type: "sistema",
      description:
        "Verifica dati: " +
        summary.label +
        " (" +
        summary.verified +
        " verificati, " +
        summary.problems +
        " da controllare)" +
        (scheduled.length
          ? " · " +
            (scheduled.length === 1
              ? "1 controllo riprogrammato"
              : scheduled.length + " controlli riprogrammati")
          : ""),
    },
  });

  return {
    results: snapshot.map((r) => ({
      ...r,
      checkedAt: (r.checkedAt ?? checkedAt).toISOString(),
    })),
    summary,
    queue: { scheduled, cleared },
  };
}

/** Verifica in blocco: sequenziale e con tetto massimo per non martellare la rete. */
export async function verifyLeads(
  leadIds: string[],
  max = 20
): Promise<{ done: number; skipped: number; verified: number; problems: number }> {
  const ids = leadIds.slice(0, max);
  let done = 0;
  let verified = 0;
  let problems = 0;
  for (const id of ids) {
    const out = await verifyLead(id);
    if (!out) continue;
    done++;
    // Conteggi aggregati: la UI che verifica una coda intera li somma blocco
    // dopo blocco e li mostra alla fine, senza rileggere il database.
    verified += out.summary.verified;
    problems += out.summary.problems;
  }
  return { done, skipped: Math.max(0, leadIds.length - ids.length), verified, problems };
}

/** Legge l'ultima fotografia salvata per un lead (con la coda dei rinvii). */
export async function getStoredVerification(leadId: string): Promise<VerifyOutcome> {
  const [rows, queued] = await Promise.all([
    prisma.verification.findMany({
      where: { leadId },
      orderBy: { field: "asc" },
    }),
    prisma.verificationRetry.findMany({
      where: { leadId },
      orderBy: { nextAttemptAt: "asc" },
    }),
  ]);
  const results: StoredVerification[] = rows.map((r) => ({
    field: r.field as VerificationResult["field"],
    status: r.status as VerificationResult["status"],
    source: r.source ?? "",
    evidence: r.evidence ?? "",
    checkedAt: r.checkedAt.toISOString(),
  }));
  return {
    results,
    summary: summarizeVerification(results),
    queue: {
      scheduled: queued.map((q) => ({
        field: q.field as RetryField,
        attempts: q.attempts,
        nextAttemptAt: q.nextAttemptAt.toISOString(),
        reason: q.reason ?? "",
        lastError: q.lastError,
      })),
      cleared: [],
    },
  };
}

/** Quanti lead si riprocessano al massimo in una chiamata di sweep. */
export const RETRY_SWEEP_MAX_LEADS = 5;

export type RetrySweepResult = {
  /** Lead riprocessati in questa chiamata. */
  processed: number;
  /** Campi che non hanno piu' bisogno di riprove (controllo riuscito o dato assente). */
  resolved: number;
  /** Campi rimandati di nuovo (stesso problema, tentativo successivo). */
  rescheduled: number;
  /** Campi abbandonati: troppi tentativi falliti, il dato resta da verificare. */
  dropped: number;
  /** Righe ancora in coda dopo questa chiamata. */
  remaining: number;
  /** Lead toccati, per dire all'utente su cosa si e' lavorato. */
  leads: Array<{ id: string; name: string }>;
};

/**
 * Riprova i controlli scaduti: prende i lead che hanno almeno un controllo in
 * coda arrivato a scadenza, li riverifica (la stessa strada del pulsante
 * "Verifica ora") e aggiorna la coda con il nuovo esito. Con un tetto, per non
 * martellare la rete: i lead che restano fuori si riprovano alla chiamata dopo.
 */
export async function runDueVerifications(
  maxLeads: number = RETRY_SWEEP_MAX_LEADS
): Promise<RetrySweepResult> {
  const limit = Math.max(1, Math.min(Math.floor(maxLeads) || RETRY_SWEEP_MAX_LEADS, 20));

  const due = await prisma.verificationRetry.findMany({
    where: { nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    // Piu' campi possono appartenere allo stesso lead: si prendono i lead
    // distinti, sempre nell'ordine di scadenza.
    take: limit * 4,
    select: { leadId: true },
  });
  const leadIds = [...new Set(due.map((r) => r.leadId))].slice(0, limit);

  let resolved = 0;
  let rescheduled = 0;
  let dropped = 0;
  const leads: Array<{ id: string; name: string }> = [];

  for (const leadId of leadIds) {
    const out = await verifyLead(leadId);
    if (!out) continue; // lead sparito a meta' strada (la coda e' in cascata)
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { name: true },
    });
    leads.push({ id: leadId, name: lead?.name ?? "" });
    rescheduled += out.queue.scheduled.length;
    for (const item of out.queue.cleared) {
      if (item.outcome === "risolto") resolved += 1;
      else dropped += 1;
    }
  }

  const remaining = await prisma.verificationRetry.count();
  return { processed: leadIds.length, resolved, rescheduled, dropped, remaining, leads };
}

/** Un controllo in coda, pronto da mostrare (o da leggere in diagnosi). */
export type QueuedRetry = {
  leadId: string;
  leadName: string;
  city: string | null;
  field: RetryField;
  attempts: number;
  nextAttemptAt: string;
  reason: string;
  lastError: string | null;
  /** Vero quando e' arrivato il momento di riprovarlo. */
  due: boolean;
};

/** La coda dei controlli rimandati, in ordine di scadenza. */
export async function getRetryQueue(limit = 50): Promise<QueuedRetry[]> {
  const take = Math.max(1, Math.min(Math.floor(limit) || 50, 200));
  const rows = await prisma.verificationRetry.findMany({
    orderBy: { nextAttemptAt: "asc" },
    take,
    include: { lead: { select: { name: true, city: true } } },
  });
  const now = Date.now();
  return rows.map((r) => ({
    leadId: r.leadId,
    leadName: r.lead.name,
    city: r.lead.city,
    field: r.field as RetryField,
    attempts: r.attempts,
    nextAttemptAt: r.nextAttemptAt.toISOString(),
    reason: r.reason ?? "",
    lastError: r.lastError,
    due: r.nextAttemptAt.getTime() <= now,
  }));
}
