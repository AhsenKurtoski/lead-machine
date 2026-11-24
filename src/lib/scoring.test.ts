import assert from "node:assert/strict";
import test from "node:test";

import { computeScore, scoreCandidate } from "./scoring";

// Il punteggio 0-100 e' la promessa centrale del prodotto: "chi ha piu'
// bisogno di me". Questi test fissano i pesi dichiarati nel modulo, cosi' un
// ritocco al punteggio non puo' passare senza che qualcuno lo veda.

test("un lead senza sito e senza social parte dai pesi del bisogno", () => {
  const result = computeScore({ hasWebsite: false, hasSocial: false });
  // 55 (nessun sito) + 15 (nessun social)
  assert.equal(result.score, 70);
  assert.match(result.reason, /nessun sito web/);
  assert.match(result.reason, /nessun social attivo/);
});

test("un sito non raggiungibile pesa piu' di un sito assente", () => {
  const offline = computeScore({ hasWebsite: true, website: "https://example.com", websiteStatus: "offline", hasSocial: true });
  const missing = computeScore({ hasWebsite: false, hasSocial: true });
  assert.equal(offline.score, 60);
  assert.equal(missing.score, 55);
  assert.ok(offline.score > missing.score);
  assert.match(offline.reason, /sito non raggiungibile/);
});

test("un sito datato vale un restyling, non un sito nuovo", () => {
  const result = computeScore({ hasWebsite: true, website: "https://example.com", websiteStatus: "datato", hasSocial: true });
  assert.equal(result.score, 45);
  assert.match(result.reason, /sito datato/);
});

test("un sito sano vale solo il controllo restyling/SEO", () => {
  const result = computeScore({ hasWebsite: true, website: "https://example.com", websiteStatus: "ok", hasSocial: true });
  assert.equal(result.score, 10);
  assert.match(result.reason, /restyling\/SEO/);
});

test("telefono e email contano solo se ci sono", () => {
  const base = { hasWebsite: false, hasSocial: false };
  const bare = computeScore(base);
  const withPhone = computeScore({ ...base, phone: "+39 02 1234567" });
  const withEmail = computeScore({ ...base, email: "info@example.com" });
  const withWhatsapp = computeScore({ ...base, whatsapp: "393331234567" });
  assert.equal(withPhone.score - bare.score, 8);
  assert.equal(withEmail.score - bare.score, 5);
  // WhatsApp e telefono sono lo stesso segnale di contattabilita'.
  assert.equal(withWhatsapp.score, withPhone.score);
});

test("le recensioni pesano a scaglioni e la reputazione richiede almeno 10 recensioni", () => {
  const base = { hasWebsite: false, hasSocial: true };
  assert.equal(computeScore({ ...base }).score, 55);
  assert.equal(computeScore({ ...base, googleReviews: 1 }).score, 59);
  assert.equal(computeScore({ ...base, googleReviews: 15 }).score, 63);
  assert.equal(computeScore({ ...base, googleReviews: 50 }).score, 67);
  // 5 stelle con 9 recensioni: nessun bonus reputazione.
  assert.equal(computeScore({ ...base, googleRating: 5, googleReviews: 9 }).score, 59);
  assert.equal(computeScore({ ...base, googleRating: 4.3, googleReviews: 10 }).score, 64);
});

test("il punteggio resta tra 0 e 100 ed e' un intero", () => {
  const max = computeScore({
    hasWebsite: true,
    website: "https://example.com",
    websiteStatus: "offline",
    hasSocial: false,
    phone: "021234567",
    email: "info@example.com",
    googleRating: 4.9,
    googleReviews: 120,
  });
  assert.equal(max.score, 100);
  assert.ok(Number.isInteger(max.score));
  assert.ok(max.score <= 100 && max.score >= 0);
});

test("lo stato del sito resta 'da_verificare' finche' non viene misurato", () => {
  assert.equal(computeScore({ hasWebsite: false, hasSocial: false }).websiteStatus, "da_verificare");
  assert.equal(
    computeScore({ hasWebsite: true, website: "https://example.com", websiteStatus: "ok", hasSocial: true }).websiteStatus,
    "ok"
  );
});

test("scoreCandidate applica le stesse regole ai candidati di OpenStreetMap", () => {
  const candidate = {
    osmId: "node/1",
    name: "Panificio Prova",
    category: "bakery",
    lat: 45.46,
    lng: 9.19,
    hasWebsite: false,
    hasSocial: false,
  };
  const result = scoreCandidate(candidate as Parameters<typeof scoreCandidate>[0]);
  assert.equal(result.score, 70);
  assert.equal(result.websiteStatus, "da_verificare");
});
