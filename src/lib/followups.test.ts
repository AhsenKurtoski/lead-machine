import assert from "node:assert/strict";
import test from "node:test";

import { bucketLabel, dueBucket, formatDateTime, formatTime } from "./followups";

// I bucket dei follow-up decidono cosa vedi per primo ("In ritardo" prima di
// "Oggi"): sono logica pura e vanno fissati, comprese le etichette tradotte.

function daysFromNow(days: number, hours = 12): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
}

test("un promemoria di ieri e' scaduto", () => {
  assert.equal(dueBucket(daysFromNow(-1)), "scaduto");
});

test("un promemoria di oggi (anche a fine giornata) e' di oggi", () => {
  assert.equal(dueBucket(daysFromNow(0, 0)), "oggi");
  assert.equal(dueBucket(daysFromNow(0, 23)), "oggi");
});

test("un promemoria di domani o piu' avanti e' prossimo", () => {
  assert.equal(dueBucket(daysFromNow(1, 0)), "prossimi");
  assert.equal(dueBucket(daysFromNow(30)), "prossimi");
});

test("accetta anche stringhe ISO, come arrivano dall'API", () => {
  assert.equal(dueBucket(daysFromNow(-2).toISOString()), "scaduto");
  assert.equal(dueBucket(daysFromNow(3).toISOString()), "prossimi");
});

test("le etichette dei bucket sono tradotte e non ricadono sull'italiano", () => {
  assert.equal(bucketLabel("scaduto"), "In ritardo");
  assert.equal(bucketLabel("oggi", "it"), "Oggi");
  assert.equal(bucketLabel("prossimi", "it"), "Prossimi");
  assert.equal(bucketLabel("scaduto", "en"), "Overdue");
  assert.equal(bucketLabel("oggi", "en"), "Today");
  assert.equal(bucketLabel("prossimi", "en"), "Upcoming");
  assert.equal(bucketLabel("scaduto", "de"), "Überfällig");
  assert.equal(bucketLabel("oggi", "fr"), "Aujourd'hui");
  assert.equal(bucketLabel("prossimi", "es"), "Próximos");
  assert.equal(bucketLabel("oggi", "pt"), "Hoje");
  assert.equal(bucketLabel("scaduto", "sl"), "Zapadlo");
  // Una lingua sconosciuta non deve rompere la pagina.
  assert.equal(bucketLabel("oggi", "xx" as Parameters<typeof bucketLabel>[1]), "Oggi");
});

test("le date vuote non diventano una data inventata", () => {
  assert.equal(formatDateTime(null), "-");
  assert.equal(formatDateTime(undefined), "-");
  assert.equal(formatTime(null), "");
  assert.equal(formatTime(undefined), "");
});

test("data e ora usano il formato della lingua richiesta", () => {
  const date = new Date("2026-11-24T15:30:00");
  const italian = formatDateTime(date, "it");
  const english = formatDateTime(date, "en");
  assert.match(italian, /2026/);
  assert.match(english, /2026/);
  assert.notEqual(italian, english);
});
