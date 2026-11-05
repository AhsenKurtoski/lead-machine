// Test delle regole della coda dei rinvii (src/lib/verify-queue.ts).
// Nessuna rete e nessun database: solo la politica (attese, tetto tentativi,
// frasi per l'utente).
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendRetryNote,
  describeDelay,
  planRetry,
  retryDelayMs,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_ATTEMPTS,
  RETRY_MAX_DELAY_MS,
  RETRY_REASON,
} from "./verify-queue";

test("retryDelayMs: attese crescenti, mai zero", () => {
  assert.equal(retryDelayMs(1), 5 * 60_000);
  assert.equal(retryDelayMs(2), 10 * 60_000);
  assert.equal(retryDelayMs(3), 20 * 60_000);
  assert.equal(retryDelayMs(4), 40 * 60_000);
  // Tentativi assenti o assurdi non devono produrre un'attesa immediata.
  assert.equal(retryDelayMs(0), RETRY_BASE_DELAY_MS);
  assert.equal(retryDelayMs(-3), RETRY_BASE_DELAY_MS);
  assert.equal(retryDelayMs(Number.NaN), RETRY_BASE_DELAY_MS);
  assert.equal(retryDelayMs(2.9), 10 * 60_000);
});

test("retryDelayMs: l'attesa si ferma al tetto", () => {
  assert.equal(retryDelayMs(20), RETRY_MAX_DELAY_MS);
  assert.equal(retryDelayMs(1000), RETRY_MAX_DELAY_MS);
});

test("describeDelay: minuti sotto l'ora, ore sopra", () => {
  assert.equal(describeDelay(0), "1 minuto");
  assert.equal(describeDelay(60_000), "1 minuto");
  assert.equal(describeDelay(5 * 60_000), "5 minuti");
  assert.equal(describeDelay(59 * 60_000), "59 minuti");
  assert.equal(describeDelay(60 * 60_000), "1 ora");
  assert.equal(describeDelay(3 * 3_600_000), "3 ore");
});

test("planRetry: al primo tentativo si riprova tra 5 minuti, dicendo quale tentativo", () => {
  const now = new Date("2026-10-13T10:00:00.000Z");
  const plan = planRetry({ attempts: 1, reason: RETRY_REASON.dns, now });
  assert.equal(plan.retry, true);
  assert.equal(plan.attempts, 1);
  assert.equal(plan.nextAttemptAt?.toISOString(), "2026-10-13T10:05:00.000Z");
  assert.match(plan.note, /resolver DNS/);
  assert.match(plan.note, /tentativo 2 di 5/);
});

test("planRetry: si smette dopo i tentativi massimi, senza fingere un verdetto", () => {
  const plan = planRetry({
    attempts: RETRY_MAX_ATTEMPTS,
    reason: RETRY_REASON.network,
    now: new Date("2026-10-13T10:00:00.000Z"),
  });
  assert.equal(plan.retry, false);
  assert.equal(plan.nextAttemptAt, null);
  assert.match(plan.note, /resta da verificare/);
});

test("planRetry: un motivo mancante non lascia la frase a meta'", () => {
  const plan = planRetry({ attempts: 1, reason: "   ", now: new Date() });
  assert.equal(plan.retry, true);
  assert.match(plan.note, /Controllo non riuscito/);
});

test("appendRetryNote: la spiegazione del campo resta una frase sola", () => {
  assert.equal(
    appendRetryNote("Formato corretto.", "Riprovo tra 5 minuti."),
    "Formato corretto. Riprovo tra 5 minuti."
  );
  assert.equal(appendRetryNote("", "Riprovo."), "Riprovo.");
  assert.equal(appendRetryNote(null, "Riprovo."), "Riprovo.");
  assert.equal(appendRetryNote(undefined, "Riprovo."), "Riprovo.");
  assert.equal(appendRetryNote("Solo questo.", "  "), "Solo questo.");
});

test("coda: le regole dichiarate restano sensate", () => {
  assert.ok(RETRY_MAX_ATTEMPTS >= 2 && RETRY_MAX_ATTEMPTS <= 10, "tentativi massimi fuori scala");
  assert.ok(RETRY_BASE_DELAY_MS >= 60_000, "la prima riprova non puo' essere immediata");
  assert.ok(RETRY_MAX_DELAY_MS > RETRY_BASE_DELAY_MS, "il tetto deve stare sopra la prima attesa");
  assert.ok(RETRY_REASON.dns.length > 0 && RETRY_REASON.network.length > 0);
});
