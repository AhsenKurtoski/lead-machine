import { test } from "node:test";
import assert from "node:assert/strict";
import { needsOnboarding, validateOnboarding } from "./onboarding";

// --- needsOnboarding: primo avvio ---

test("needsOnboarding: impostazioni vuote -> serve l'onboarding", () => {
  assert.equal(needsOnboarding({}), true);
});

test("needsOnboarding: onboarding gia completato -> non serve", () => {
  assert.equal(needsOnboarding({ onboarding_done: "true" }), false);
  assert.equal(needsOnboarding({ onboarding_done: "TRUE" }), false);
});

test("needsOnboarding: onboarding esplicitamente saltato -> non serve", () => {
  assert.equal(needsOnboarding({ onboarding_done: "skipped" }), false);
});

test("needsOnboarding: citta gia impostata a mano -> non serve", () => {
  assert.equal(needsOnboarding({ search_city: "Belluno" }), false);
});

test("needsOnboarding: citta vuota o solo spazi -> serve", () => {
  assert.equal(needsOnboarding({ search_city: "   " }), true);
});

// --- validateOnboarding: validazione form ---

test("validateOnboarding: citta mancante -> errore", () => {
  const res = validateOnboarding({ brandName: "Agencia", searchCity: "" });
  assert.equal(res.ok, false);
  assert.ok(res.errors.searchCity);
});

test("validateOnboarding: citta presente -> ok", () => {
  const res = validateOnboarding({ brandName: "Agencia", owner: "Mario", searchCity: "Feltre" });
  assert.equal(res.ok, true);
  assert.deepEqual(res.errors, {});
});

test("validateOnboarding: campi troppo lunghi -> errori", () => {
  const res = validateOnboarding({
    brandName: "x".repeat(121),
    owner: "y".repeat(121),
    searchCity: "z".repeat(101),
  });
  assert.equal(res.ok, false);
  assert.ok(res.errors.searchCity);
  assert.ok(res.errors.brandName);
  assert.ok(res.errors.owner);
});

test("validateOnboarding: brand e referente facoltativi", () => {
  const res = validateOnboarding({ searchCity: "Belluno" });
  assert.equal(res.ok, true);
});
