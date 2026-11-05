import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRealContactEmail,
  osmContactEmail,
  osmUrlWithContact,
  osmUserAgent,
  userAgentFor,
  PROJECT_URL,
} from "./osm";

// --- isRealContactEmail: la causa del 403 di Nominatim ---
//
// Nominatim risponde "Access denied" a qualsiasi User-Agent che contenga un
// indirizzo segnaposto: questi casi vanno tutti riconosciuti come NON reali.

test("isRealContactEmail: un indirizzo vero e' accettato", () => {
  assert.equal(isRealContactEmail("info@leadmachine.app"), true);
  assert.equal(isRealContactEmail("mario.rossi@gmail.com"), true);
  assert.equal(isRealContactEmail("  anna@studio-legale.it  "), true);
  assert.equal(isRealContactEmail("a@b.co"), true);
});

test("isRealContactEmail: gli indirizzi segnaposto sono rifiutati", () => {
  for (const placeholder of [
    "anonimo@example.com",
    "contact@example.com",
    "x@example.org",
    "x@example.net",
    "info@esempio.it",
    "test@test.com",
    "chi@invalid.example",
    "x@localhost",
    "api@leadmachine.local",
    "bot@qualcosa.test",
    "x@server.internal",
  ]) {
    assert.equal(isRealContactEmail(placeholder), false, placeholder);
  }
});

test("isRealContactEmail: valori vuoti, non stringhe o malformati sono rifiutati", () => {
  for (const bad of ["", "   ", null, undefined, 42, {}, "senza-chiocciola", "due@@punti.it", "a@b"]) {
    assert.equal(isRealContactEmail(bad), false, JSON.stringify(bad));
  }
});

test("isRealContactEmail: un dominio che inizia per 'test' non e' un segnaposto se ha un dominio vero", () => {
  assert.equal(isRealContactEmail("info@testimonianze.it"), true);
  assert.equal(isRealContactEmail("info@levante.it"), true);
});

// --- User-Agent: sempre valido, mai un'email segnaposto ---

test("userAgentFor: con contatto reale lo include", () => {
  assert.equal(userAgentFor("info@leadmachine.app"), "LeadMachine/1.0 (info@leadmachine.app)");
});

test("userAgentFor: senza contatto (o con uno segnaposto) usa l'URL del progetto", () => {
  const expected = "LeadMachine/1.0 (+" + PROJECT_URL + ")";
  assert.equal(userAgentFor(), expected);
  assert.equal(userAgentFor(null), expected);
  assert.equal(userAgentFor("anonimo@example.com"), expected);
  assert.ok(!userAgentFor("anonimo@example.com").includes("example.com"));
  assert.ok(!userAgentFor().includes("@"));
});

test("osmUserAgent: legge l'ambiente e ignora i segnaposto", () => {
  assert.equal(osmUserAgent({}), "LeadMachine/1.0 (+" + PROJECT_URL + ")");
  assert.equal(osmUserAgent({ OSM_CONTACT_EMAIL: "anonimo@example.com" }), "LeadMachine/1.0 (+" + PROJECT_URL + ")");
  assert.equal(osmUserAgent({ OSM_CONTACT_EMAIL: "info@leadmachine.app" }), "LeadMachine/1.0 (info@leadmachine.app)");
});

test("osmContactEmail: null quando non c'e' un indirizzo reale", () => {
  assert.equal(osmContactEmail({}), null);
  assert.equal(osmContactEmail({ OSM_CONTACT_EMAIL: "" }), null);
  assert.equal(osmContactEmail({ OSM_CONTACT_EMAIL: " anonimo@example.com " }), null);
  assert.equal(osmContactEmail({ OSM_CONTACT_EMAIL: " info@leadmachine.app " }), "info@leadmachine.app");
});

// --- URL con email= (consigliata dalla policy per uso intenso) ---

test("osmUrlWithContact: aggiunge email= solo con un contatto reale", () => {
  const base = "https://nominatim.openstreetmap.org/search?format=json&q=Feltre";
  assert.equal(osmUrlWithContact(base, {}), base);
  assert.equal(osmUrlWithContact(base, { OSM_CONTACT_EMAIL: "anonimo@example.com" }), base);
  assert.equal(
    osmUrlWithContact(base, { OSM_CONTACT_EMAIL: "info@leadmachine.app" }),
    base + "&email=info%40leadmachine.app"
  );
});

test("osmUrlWithContact: non aggiunge email= due volte", () => {
  const url = "https://nominatim.openstreetmap.org/search?q=Feltre&email=info%40leadmachine.app";
  assert.equal(osmUrlWithContact(url, { OSM_CONTACT_EMAIL: "altro@leadmachine.app" }), url);
});
