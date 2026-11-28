import assert from "node:assert/strict";
import { test } from "node:test";

import { PDFParse } from "pdf-parse";

import { buildReceiptPdf, pdfSafeText, receiptPdfFilename, wrap } from "./receipt-pdf";

async function textOf(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text.replace(/\s+/g, " ");
  } finally {
    await parser.destroy();
  }
}

const base = {
  number: "RICEVUTA-2026-007",
  paidAt: new Date("2026-03-04T10:00:00Z"),
  amount: 1234.57,
  method: "bonifico",
  description: "Sito web e manutenzione",
  leadName: "Mario Rossi",
  brandName: "Studio Rossi",
  issuer: "Ahsen Kurtoski",
  locale: "it" as const,
  currency: "EUR",
};

test("il PDF è un documento valido con i dati della ricevuta", async () => {
  const bytes = await buildReceiptPdf(base);
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");

  const text = await textOf(bytes);
  assert.match(text, /Studio Rossi/);
  assert.match(text, /RICEVUTA-2026-007/);
  assert.match(text, /Mario Rossi/);
  assert.match(text, /Sito web e manutenzione/);
  assert.match(text, /1234,57/);
  assert.match(text, /Metodo: Bonifico/);
  assert.match(text, /Non e' un documento fiscale/);
  assert.match(text, /Registra il pagamento ricevuto, non la fattura/);
});

test("note e caratteri non supportati non fanno fallire la ricevuta", async () => {
  const text = await textOf(
    await buildReceiptPdf({ ...base, description: "Ristrutturazione bagno \u{1F600} \u2014 preventivo", notes: "Saldo \u201Cfinale\u201D" })
  );
  assert.match(text, /Ristrutturazione bagno/);
  assert.match(text, /preventivo/);
  assert.match(text, /Saldo "finale"/);
  assert.equal(text.includes("\u{1F600}"), false);
});

test("il testo per i font standard sostituisce i caratteri fuori da WinAnsi", () => {
  assert.equal(pdfSafeText("\u201Cciao\u201D \u2014 ok\u2026"), '"ciao" - ok...');
  assert.equal(pdfSafeText("bagno \u{1F600}"), "bagno ?");
  assert.equal(pdfSafeText("città è più"), "città è più");
  assert.equal(pdfSafeText(null), "");
});

test("il nome del file è sicuro e leggibile", () => {
  assert.equal(receiptPdfFilename("RICEVUTA-2026-001"), "ricevuta-RICEVUTA-2026-001.pdf");
  assert.equal(receiptPdfFilename('../../etc/pass wd'), "ricevuta-etc-pass-wd.pdf");
  assert.equal(receiptPdfFilename("///"), "ricevuta-senza-numero.pdf");
});

test("le descrizioni lunghe vanno a capo invece di uscire dalla pagina", () => {
  const lines = wrap("parola ".repeat(40).trim(), 20);
  assert.ok(lines.length > 1);
  assert.ok(lines.every((line) => line.length <= 20));
});
