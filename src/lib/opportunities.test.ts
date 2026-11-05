// Test della coda opportunita (src/lib/opportunities.ts).
// Runner: node:test (nessuna dipendenza aggiuntiva) via `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildOpportunities,
  filterOpportunities,
  hasNoWebsite,
  isContactable,
  opportunityStats,
  opportunityStatusLabel,
  type OpportunityLead,
} from "./opportunities";

function lead(over: Partial<OpportunityLead> & { id: string; name: string }): OpportunityLead {
  return {
    category: "ristorante",
    city: "Feltre",
    hasWebsite: false,
    hasSocial: false,
    ...over,
  };
}

// ------------------------------------------------------------
// hasNoWebsite
// ------------------------------------------------------------

test("hasNoWebsite: vero solo se non ha flag ne URL", () => {
  assert.equal(hasNoWebsite(lead({ id: "1", name: "A" })), true);
  assert.equal(hasNoWebsite(lead({ id: "2", name: "B", hasWebsite: true })), false);
  assert.equal(hasNoWebsite(lead({ id: "3", name: "C", website: "https://x.it" })), false);
});

test("hasNoWebsite: URL vuoto o di soli spazi non conta come sito", () => {
  assert.equal(hasNoWebsite(lead({ id: "1", name: "A", website: "" })), true);
  assert.equal(hasNoWebsite(lead({ id: "2", name: "B", website: "   " })), true);
});

// ------------------------------------------------------------
// isContactable
// ------------------------------------------------------------

test("isContactable: basta un canale tra telefono, WhatsApp o email", () => {
  assert.equal(isContactable(lead({ id: "1", name: "A", phone: "+39 333 1111111" })), true);
  assert.equal(isContactable(lead({ id: "2", name: "B", whatsapp: "393331111111" })), true);
  assert.equal(isContactable(lead({ id: "3", name: "C", email: "a@b.it" })), true);
  assert.equal(isContactable(lead({ id: "4", name: "D" })), false);
  assert.equal(isContactable(lead({ id: "5", name: "E", phone: "  " })), false);
});

// ------------------------------------------------------------
// Ordinamento della coda
// ------------------------------------------------------------

test("buildOpportunities: mette davanti chi non ha sito ed e contattabile", () => {
  const items = buildOpportunities([
    lead({ id: "con-sito", name: "Con Sito", hasWebsite: true, phone: "3331111111" }),
    lead({ id: "no-sito-no-contatti", name: "Zeta", website: "https://z.it" }),
    lead({ id: "no-sito-contattabile", name: "Alfa", phone: "3339999999" }),
  ]);

  assert.equal(items[0].lead.id, "no-sito-contattabile");
  assert.equal(items[0].withoutWebsite, true);
  assert.equal(items[0].contactable, true);
});

test("buildOpportunities: ordine deterministico a parita di punteggio", () => {
  const a = lead({ id: "b", name: "Bar Sport" });
  const b = lead({ id: "a", name: "Alimentari Rossi" });
  const first = buildOpportunities([a, b]).map((i) => i.lead.name);
  const second = buildOpportunities([b, a]).map((i) => i.lead.name);
  assert.deepEqual(first, second, "l'ordine non deve dipendere dall'input");
  assert.deepEqual(first, ["Alimentari Rossi", "Bar Sport"]);
});

test("buildOpportunities: chi ha un sito finisce dopo chi non lo ha", () => {
  const items = buildOpportunities([
    lead({ id: "1", name: "Con sito", hasWebsite: true, googleReviews: 500 }),
    lead({ id: "2", name: "Senza sito" }),
  ]);
  assert.equal(items[items.length - 1].lead.id, "1");
});

test("buildOpportunities: ogni voce porta punteggio e motivo leggibili", () => {
  const [first] = buildOpportunities([lead({ id: "1", name: "A", phone: "3331111111" })]);
  assert.ok(first.score > 0);
  assert.ok(typeof first.reason === "string" && first.reason.length > 0);
});

// ------------------------------------------------------------
// Filtri
// ------------------------------------------------------------

test("filterOpportunities: solo senza sito / solo contattabili", () => {
  const items = buildOpportunities([
    lead({ id: "1", name: "A", phone: "3331111111" }),
    lead({ id: "2", name: "B" }),
    lead({ id: "3", name: "C", hasWebsite: true, phone: "3332222222" }),
  ]);

  assert.deepEqual(
    filterOpportunities(items, { onlyWithoutWebsite: true }).map((i) => i.lead.name),
    ["A", "B"]
  );
  assert.deepEqual(
    filterOpportunities(items, { onlyContactable: true, onlyWithoutWebsite: true }).map((i) => i.lead.name),
    ["A"]
  );
});

test("filterOpportunities: citta, categoria e ricerca testuale", () => {
  const items = buildOpportunities([
    lead({ id: "1", name: "Pizzeria Da Marco", city: "Feltre", category: "pizzeria" }),
    lead({ id: "2", name: "Hotel Belluno", city: "Belluno", category: "hotel" }),
  ]);

  assert.equal(filterOpportunities(items, { city: "feltre" }).length, 1);
  assert.equal(filterOpportunities(items, { category: "hotel" }).length, 1);
  assert.equal(filterOpportunities(items, { search: "marco" }).length, 1);
  assert.equal(filterOpportunities(items, { search: "inesistente" }).length, 0);
});

test("filterOpportunities: nessun filtro -> nessuna sorpresa", () => {
  const items = buildOpportunities([lead({ id: "1", name: "A" }), lead({ id: "2", name: "B" })]);
  assert.equal(filterOpportunities(items, {}).length, 2);
});

// ------------------------------------------------------------
// Statistiche ed etichette
// ------------------------------------------------------------

test("opportunityStats: conta totali, senza sito e contattabili senza sito", () => {
  const items = buildOpportunities([
    lead({ id: "1", name: "A", phone: "3331111111" }),
    lead({ id: "2", name: "B" }),
    lead({ id: "3", name: "C", hasWebsite: true }),
  ]);
  assert.deepEqual(opportunityStats(items), {
    total: 3,
    withoutWebsite: 2,
    contactableWithoutWebsite: 1,
  });
});

test("opportunityStatusLabel: traduce gli stati noti e non rompe sugli altri", () => {
  assert.equal(opportunityStatusLabel("nuovo"), "Nuova");
  assert.equal(opportunityStatusLabel("CLIENTE"), "Cliente");
  assert.equal(opportunityStatusLabel(null), "Nuova");
  assert.equal(opportunityStatusLabel("stato-strano"), "STATO-STRANO");
});
