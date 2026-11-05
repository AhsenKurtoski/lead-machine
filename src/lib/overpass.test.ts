// Test del costruttore di query Overpass e della normalizzazione dei numeri.
// Runner: node:test (nessuna dipendenza aggiuntiva) via `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CATEGORIES } from "./categories";
import { buildOverpassQuery, normalizePhone } from "./overpass";

/** Solo le righe che contengono uno statement spaziale (nwr(...)). */
function statements(query: string): string[] {
  return query.split("\n").filter((line) => line.trimStart().startsWith("nwr("));
}

/** Estrae l'alternation del filtro regex di una chiave, es. amenity -> ["bar","cafe"]. */
function alternationFor(query: string, key: string): string[] {
  const line = statements(query).find((l) => l.includes(`["${key}"~`));
  if (!line) return [];
  const match = /\["[a-z_:]+"~"\^\(([^)]*)\)\$"\]/.exec(line);
  return match ? match[1].split("|") : [];
}

// ------------------------------------------------------------
// normalizePhone
// ------------------------------------------------------------

test("normalizePhone: input vuoto o senza cifre -> undefined", () => {
  assert.equal(normalizePhone(undefined), undefined);
  assert.equal(normalizePhone(""), undefined);
  assert.equal(normalizePhone("   "), undefined);
  assert.equal(normalizePhone("abc"), undefined);
});

test("normalizePhone: aggiunge il prefisso 39 ai numeri locali", () => {
  assert.equal(normalizePhone("333 1234567"), "393331234567");
  assert.equal(normalizePhone("0437 123456"), "390437123456");
});

test("normalizePhone: normalizza i prefissi internazionali", () => {
  assert.equal(normalizePhone("+39 333 1234567"), "393331234567");
  assert.equal(normalizePhone("0039 3331234567"), "393331234567");
  assert.equal(normalizePhone("393331234567"), "393331234567");
});

test("normalizePhone: non aggiunge 39 a un numero locale di un altro paese", () => {
  assert.equal(normalizePhone("020 7946 0958", "GB"), "02079460958");
  assert.equal(normalizePhone("415 555 0100", "US"), "4155550100");
});

// ------------------------------------------------------------
// buildOverpassQuery
// ------------------------------------------------------------

test("buildOverpassQuery: query QL JSON con output center tags", () => {
  const query = buildOverpassQuery(["ristorante"], 46.0172, 11.91, 5000);
  assert.ok(query.startsWith("[out:json]"), query.slice(0, 20));
  assert.ok(query.trimEnd().endsWith("out center tags;"));
  assert.match(query, /nwr\(around:5000,46\.0172,11\.91\)\["name"\]\["amenity"~/);
});

test("buildOverpassQuery: un solo statement per chiave, valori in alternation e dedup", () => {
  const query = buildOverpassQuery(["bar", "ristorante"], 46, 12, 1000);
  const lines = statements(query);
  assert.equal(lines.length, 1, "atteso un unico statement per la chiave amenity");

  const values = alternationFor(query, "amenity");
  for (const expected of ["bar", "cafe", "pub", "restaurant"]) {
    assert.ok(values.includes(expected), `manca il valore ${expected} (trovati: ${values.join(",")})`);
  }
  assert.equal(values.filter((v) => v === "restaurant").length, 1, "valore duplicato nell'alternation");
});

test("buildOverpassQuery: il vincolo spaziale precede i filtri sui tag", () => {
  // L'ordine (around:...) prima dei tag e' cio' che rende la query veloce su Overpass.
  for (const line of statements(buildOverpassQuery([], 46, 12, 1000))) {
    assert.ok(
      line.indexOf("(around:") < line.indexOf('["name"]'),
      `ordine errato nello statement: ${line}`
    );
  }
});

test("buildOverpassQuery: senza categorie usa tutte le categorie, una per chiave", () => {
  const query = buildOverpassQuery([], 46, 12, 1000);
  const keys = new Set<string>();
  for (const line of statements(query)) {
    const match = /\["([a-z_:]+)"~"/.exec(line);
    if (match) keys.add(match[1]);
  }

  const expected = new Set<string>();
  for (const category of CATEGORIES) {
    for (const [key] of category.selectors) expected.add(key);
  }

  assert.deepEqual([...keys].sort(), [...expected].sort());
  assert.equal(statements(query).length, expected.size, "uno statement per chiave distinta");
});

test("buildOverpassQuery: raggio e coordinate finiscono nel vincolo around", () => {
  const query = buildOverpassQuery(["hotel"], 45.1234, 9.5678, 2500);
  assert.match(query, /\(around:2500,45\.1234,9\.5678\)/);
});

test("buildOverpassQuery: categoria sconosciuta -> nessun throw, unione vuota", () => {
  const query = buildOverpassQuery(["non-esiste"], 46, 12, 1000);
  assert.ok(query.includes("[out:json]"));
  assert.equal(statements(query).length, 0);
});
