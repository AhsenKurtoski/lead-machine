import test from "node:test";
import assert from "node:assert/strict";
import { distinctiveNameTokens, pickWebsiteCandidate, websiteMatchesLead } from "./website-finder";

test("website finder: ignora le parole generiche della categoria", () => {
  assert.deepEqual(distinctiveNameTokens("Autofficina Castelli Camper Service"), ["castelli"]);
  assert.deepEqual(distinctiveNameTokens("Carrozzeria D'Isep"), ["isep"]);
  assert.deepEqual(distinctiveNameTokens("Estetica Soleluna"), ["soleluna"]);
});

test("website finder: accetta solo un dominio con il nome distintivo", () => {
  const found = pickWebsiteCandidate("Carrozzeria Castello", [
    "https://castellocarservice.it",
    "https://firmania.it",
  ]);
  assert.equal(found.website, "https://castellocarservice.it");
  assert.equal(found.confidence, "alta");
});

test("website finder: non scambia una directory per il sito dell'attivita", () => {
  const found = pickWebsiteCandidate("Autofficina Norelli", ["https://firmania.it"]);
  assert.equal(found.website, null);
  assert.equal(found.confidence, "media");
});

test("website finder: 'camper' non basta per l'Autofficina Castelli", () => {
  const found = pickWebsiteCandidate("Autofficina Castelli Camper Service", [
    "https://ricambicamper.it",
  ]);
  assert.equal(found.website, null);
});

test("website finder: 'pizzeria' non basta per Speckeller", () => {
  const found = pickWebsiteCandidate("Pizzeria Speckeller", ["https://bepizzeria.it"]);
  assert.equal(found.website, null);
});

test("website finder: riconosce il dominio giusto senza confonderlo con un portale", () => {
  const found = pickWebsiteCandidate("Estetica Soleluna", [
    "https://www.esteticasoleluna.it",
    "https://reteimprese.it",
  ]);
  assert.equal(found.website, "https://www.esteticasoleluna.it");
  assert.equal(found.confidence, "alta");
});

test("website finder: un nome senza token distintivi non produce un sito", () => {
  const found = pickWebsiteCandidate("Pizzeria", ["https://pizzeria.it"]);
  assert.equal(found.website, null);
  assert.equal(found.confidence, "media");
});

test("website finder: la citta' nell'URL conferma il candidato", () => {
  assert.equal(
    websiteMatchesLead(
      { url: "https://superautofeltre.it", city: "Feltre" },
      "",
    ),
    true,
  );
});

test("website finder: un omonimo in un'altra citta' viene rifiutato", () => {
  assert.equal(
    websiteMatchesLead(
      { url: "https://castellocarservice.it", city: "Feltre", phone: "0439 83532" },
      "Castello Car Service - Viale Cremona - telefono 0375 82341",
    ),
    false,
  );
});

test("website finder: la citta' o il telefono nella pagina confermano il candidato", () => {
  assert.equal(
    websiteMatchesLead(
      { url: "https://example.it", city: "Feltre" },
      "<p>Ci trovi a Feltre, in provincia di Belluno.</p>",
    ),
    true,
  );
  assert.equal(
    websiteMatchesLead(
      { url: "https://example.it", city: "Feltre", phone: "+39 0439 83532" },
      "<a href=\"tel:+39043983532\">Chiamaci</a>",
    ),
    true,
  );
});
