// Test degli helper delle ricevute di pagamento (src/lib/receipts.ts).
// Runner: node:test (nessuna dipendenza aggiuntiva) via `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatCurrency,
  formatEuro,
  generateReceiptNumber,
  methodLabel,
  normalizeMethod,
  parseAmount,
  RECEIPT_METHODS,
  toDateInputValue,
} from "./receipts";

// ------------------------------------------------------------
// Importi
// ------------------------------------------------------------

test("parseAmount: importi validi, con virgola o punto", () => {
  assert.equal(parseAmount(150), 150);
  assert.equal(parseAmount("150.5"), 150.5);
  assert.equal(parseAmount("150,50"), 150.5);
  assert.equal(parseAmount(" 89 "), 89);
});

test("parseAmount: input non valido o negativo -> 0", () => {
  for (const raw of [null, undefined, "", "abc", "-10", NaN, Infinity, {}]) {
    assert.equal(parseAmount(raw), 0, `input: ${String(raw)}`);
  }
});

test("parseAmount: arrotonda ai centesimi senza introdurre valori negativi", () => {
  assert.equal(parseAmount("10.005"), 10.01);
  assert.equal(parseAmount("0.001"), 0);
  assert.equal(parseAmount("99.999"), 100);
});

test("parseAmount: accetta lo zero (servizio gratuito pagato)", () => {
  assert.equal(parseAmount(0), 0);
  assert.equal(parseAmount("0"), 0);
});

// ------------------------------------------------------------
// Metodo di pagamento
// ------------------------------------------------------------

test("normalizeMethod: ammette solo i metodi previsti", () => {
  assert.equal(normalizeMethod("contanti"), "contanti");
  assert.equal(normalizeMethod("BONIFICO"), "bonifico");
  assert.equal(normalizeMethod(" carta "), "carta");
  assert.equal(normalizeMethod("altro"), "altro");
});

test("normalizeMethod: valori sconosciuti o vuoti -> contanti", () => {
  for (const raw of [null, undefined, "", "assegno", "bitcoin", 42]) {
    assert.equal(normalizeMethod(raw), "contanti", `input: ${String(raw)}`);
  }
});

test("methodLabel: etichetta leggibile e sempre definita", () => {
  assert.equal(methodLabel("bonifico"), "Bonifico");
  assert.equal(methodLabel("carta"), "Carta");
  assert.equal(methodLabel("sconosciuto"), "Contanti");
});

test("RECEIPT_METHODS: elenco coerente senza duplicati", () => {
  assert.ok(RECEIPT_METHODS.length >= 4);
  const keys = RECEIPT_METHODS.map((m) => m.key);
  assert.equal(new Set(keys).size, keys.length, "metodi duplicati");
  for (const m of RECEIPT_METHODS) {
    assert.ok(m.label.trim().length > 0, "etichetta vuota per " + m.key);
  }
});

// ------------------------------------------------------------
// Numerazione
// ------------------------------------------------------------

test("generateReceiptNumber: formato RICEVUTA-anno-NNN", () => {
  const year = new Date().getFullYear();
  assert.equal(generateReceiptNumber(1), `RICEVUTA-${year}-001`);
  assert.equal(generateReceiptNumber(42), `RICEVUTA-${year}-042`);
  assert.equal(generateReceiptNumber(123), `RICEVUTA-${year}-123`);
});

test("generateReceiptNumber: sequenza non valida -> parte da 001", () => {
  const year = new Date().getFullYear();
  assert.equal(generateReceiptNumber(0), `RICEVUTA-${year}-001`);
  assert.equal(generateReceiptNumber(-5), `RICEVUTA-${year}-001`);
  assert.equal(generateReceiptNumber(NaN), `RICEVUTA-${year}-001`);
});

// ------------------------------------------------------------
// Date e valuta
// ------------------------------------------------------------

test("toDateInputValue: formatta per gli input date e ignora i valori non validi", () => {
  assert.equal(toDateInputValue("2026-03-07T10:00:00.000Z").length, 10);
  assert.match(toDateInputValue(new Date()), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(toDateInputValue(null), "");
  assert.equal(toDateInputValue("non-una-data"), "");
});

test("formatEuro: usa EUR e rispetta la locale", () => {
  assert.match(formatEuro(1234.5), /€/);
  assert.equal(formatEuro(10), formatCurrency(10, "it", "EUR"));
  assert.notEqual(formatEuro(1234.5, "it"), formatEuro(1234.5, "en"));
});

test("formatCurrency: rispetta la valuta richiesta", () => {
  assert.match(formatCurrency(10, "en", "USD"), /\$|USD/);
});

// ------------------------------------------------------------
// Regressione: la ricevuta non deve reintrodurre contenuti fiscali
// ------------------------------------------------------------

test("nessun riferimento fiscale negli helper delle ricevute", async () => {
  const source = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("./receipts.ts", import.meta.url), "utf8")
  );
  const stripped = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const banned of ["IVA", "P.IVA", "aliquota", "sconto", "acconto", "fattura"]) {
    assert.ok(
      !new RegExp(banned, "i").test(stripped),
      `receipts.ts contiene ancora "${banned}"`
    );
  }
});
