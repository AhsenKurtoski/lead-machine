// Test delle regole di verifica dei dati (src/lib/verify.ts).
// Runner: node:test (nessuna dipendenza aggiuntiva) via `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkAddress,
  checkEmail,
  checkPhone,
  checkSocial,
  checkWebsiteField,
  emailDomain,
  findDuplicateGroups,
  isDisposableEmail,
  mxVerdictFromError,
  phoneKind,
  summarizeVerification,
  verifyLeadOffline,
} from "./verify";

const VERIFICABILI = ["verificato", "da_verificare", "non_raggiungibile", "non_valido", "assente"];

// ------------------------------------------------------------
// Email
// ------------------------------------------------------------

test("checkEmail: assente, non valida, temporanea, valida", () => {
  assert.equal(checkEmail(null).status, "assente");
  assert.equal(checkEmail("  ").status, "assente");
  assert.equal(checkEmail("non-una-email").status, "non_valido");
  assert.equal(checkEmail("a@b").status, "non_valido");
  assert.equal(checkEmail("tizio@mailinator.com").status, "non_valido");
  assert.equal(checkEmail("info@ristorante.it", { hasMx: true }).status, "verificato");
});

test("checkEmail: senza controllo MX il dato resta da verificare, non verificato", () => {
  const r = checkEmail("info@ristorante.it", null);
  assert.equal(r.status, "da_verificare");
});

test("checkEmail: dominio senza MX -> non raggiungibile", () => {
  assert.equal(checkEmail("info@senza-mx.it", { hasMx: false }).status, "non_raggiungibile");
});

test("mxVerdictFromError: un errore di rete non e' un dominio senza email", () => {
  // Se il resolver non risponde il controllo NON e' stato fatto: nessun verdetto.
  assert.equal(mxVerdictFromError("ECONNREFUSED"), null);
  assert.equal(mxVerdictFromError("ETIMEOUT"), null);
  assert.equal(mxVerdictFromError("EAI_AGAIN"), null);
  assert.equal(mxVerdictFromError("SERVFAIL"), null);
  assert.equal(mxVerdictFromError("EBADRESP"), null);
  assert.equal(mxVerdictFromError(null), null);
  assert.equal(mxVerdictFromError(undefined), null);
});

test("mxVerdictFromError: dominio inesistente o senza record -> nessun MX (definitivo)", () => {
  assert.equal(mxVerdictFromError("ENOTFOUND")?.hasMx, false);
  assert.equal(mxVerdictFromError("ENODATA")?.hasMx, false);
  assert.equal(mxVerdictFromError("NXDOMAIN")?.hasMx, false);
  assert.equal(mxVerdictFromError("notfound")?.hasMx, false);
});

test("checkEmail: MX non controllato (errore di rete) -> da verificare, mai non raggiungibile", () => {
  const r = checkEmail("info@yahoo.com", mxVerdictFromError("ECONNREFUSED"));
  assert.equal(r.status, "da_verificare");
});

test("emailDomain / isDisposableEmail", () => {
  assert.equal(emailDomain("Info@Esempio.IT"), "esempio.it");
  assert.equal(emailDomain("senza-chiocciola"), "");
  assert.equal(isDisposableEmail("a@yopmail.com"), true);
  assert.equal(isDisposableEmail("a@sottodominio.yopmail.com"), true);
  assert.equal(isDisposableEmail("a@gmai1.com"), false);
});

// ------------------------------------------------------------
// Telefono
// ------------------------------------------------------------

test("phoneKind: distingue cellulare, fisso e sconosciuto", () => {
  assert.equal(phoneKind("393331234567"), "mobile");
  assert.equal(phoneKind("390439123456"), "fisso");
  assert.equal(phoneKind(""), "sconosciuto");
});

test("checkPhone: assente, non valido (lunghezza), valido", () => {
  assert.equal(checkPhone({}).status, "assente");
  assert.equal(checkPhone({ phone: "12345" }).status, "non_valido");
  assert.equal(checkPhone({ phone: "+39 0439 123456" }).status, "da_verificare");
});

test("checkPhone: con WhatsApp il numero resta da verificare (non abbiamo contattato WhatsApp)", () => {
  const r = checkPhone({ phone: "+39 0439 123456", whatsapp: "393331234567" });
  assert.equal(r.status, "da_verificare");
  assert.match(r.evidence, /cellulare/);
  assert.match(r.evidence, /non e stato verificato/i);
});

test("checkPhone: un numero plausibile non e mai dichiarato verificato senza WhatsApp", () => {
  assert.equal(checkPhone({ phone: "+39 333 1234567" }).status, "da_verificare");
});

// ------------------------------------------------------------
// Sito web
// ------------------------------------------------------------

test("checkWebsiteField: sito raggiungibile -> verificato", () => {
  assert.equal(checkWebsiteField({ website: "https://x.it" }, { reachable: true }).status, "verificato");
});

test("checkWebsiteField: mai controllato -> da verificare", () => {
  assert.equal(checkWebsiteField({ website: "https://x.it" }, null).status, "da_verificare");
});

test("checkWebsiteField: con un errore HTTP il verdetto dice quale, non 'non risponde'", () => {
  const r = checkWebsiteField({ website: "https://x.it" }, { reachable: false, httpStatus: 403 });
  assert.equal(r.status, "non_raggiungibile");
  assert.match(r.evidence, /HTTP 403/);
});

test("checkWebsiteField: nessuna risposta affatto -> da verificare, mai un verdetto sul sito", () => {
  // La richiesta non e' riuscita: non sappiamo se il problema e' il sito o la
  // nostra rete, quindi il dato non viene dichiarato irraggiungibile (lo stesso
  // errore che la verifica dell'email faceva con il DNS che non risponde).
  for (const http of [{ reachable: false, httpStatus: null }, { reachable: false }]) {
    const r = checkWebsiteField({ website: "https://x.it" }, http);
    assert.equal(r.status, "da_verificare");
    assert.doesNotMatch(r.evidence, /non risponde|irraggiungibile|urgente/i);
    assert.match(r.evidence, /ancora stabilito/);
  }
});

test("checkWebsiteField: senza sito, solo una ricerca eseguita lo conferma", () => {
  assert.equal(checkWebsiteField({}, null, false).status, "da_verificare");
  const searched = checkWebsiteField({}, null, true);
  assert.equal(searched.status, "verificato");
  assert.equal(searched.source, "ricerca_web");
});

// ------------------------------------------------------------
// Indirizzo e social
// ------------------------------------------------------------

test("checkAddress: assente, completo ma non geocodificato, parziale, geocodificato", () => {
  assert.equal(checkAddress({}).status, "assente");
  assert.equal(
    checkAddress({ addressFull: "Via Roma 1", city: "Feltre", lat: 46.01, lng: 11.9 }).status,
    "da_verificare"
  );
  assert.equal(
    checkAddress({
      addressFull: "Via Roma 1",
      city: "Feltre",
      lat: 46.01,
      lng: 11.9,
      geocoded: true,
    }).status,
    "verificato"
  );
  assert.equal(checkAddress({ city: "Feltre" }).status, "da_verificare");
});

test("checkAddress: coordinate non finite non contano come posizione", () => {
  assert.equal(checkAddress({ addressFull: "Via Roma 1", lat: NaN, lng: 11.9 }).status, "da_verificare");
});

test("checkSocial: link presente ma non verificato, segnalato senza link, assente", () => {
  assert.equal(checkSocial({ instagram: "https://instagram.com/x" }).status, "da_verificare");
  assert.equal(checkSocial({ hasSocial: true }).status, "da_verificare");
  assert.equal(checkSocial({}).status, "assente");
});

// ------------------------------------------------------------
// Sintesi, invariate e doppioni
// ------------------------------------------------------------

test("summarizeVerification: verdetto coerente con gli esiti", () => {
  const ok = summarizeVerification([
    { field: "phone", status: "verificato", source: "s", evidence: "" },
    { field: "email", status: "verificato", source: "s", evidence: "" },
  ]);
  assert.equal(ok.overall, "verificato");
  assert.equal(ok.verified, 2);

  const pending = summarizeVerification([
    { field: "phone", status: "verificato", source: "s", evidence: "" },
    { field: "email", status: "da_verificare", source: "s", evidence: "" },
  ]);
  assert.equal(pending.overall, "da_verificare");
  assert.equal(pending.pending, 1);

  const bad = summarizeVerification([
    { field: "website", status: "non_raggiungibile", source: "s", evidence: "" },
    { field: "email", status: "non_valido", source: "s", evidence: "" },
  ]);
  assert.equal(bad.overall, "attenzione");
  assert.equal(bad.problems, 2);
});

test("verifyLeadOffline: produce un esito per ognuno dei 5 campi, sempre con fonte e spiegazione", () => {
  const results = verifyLeadOffline({
    phone: "+39 0439 123456",
    email: "info@ristorante.it",
    city: "Feltre",
    lat: 46.01,
    lng: 11.9,
  });
  assert.equal(results.length, 5);
  assert.deepEqual(
    results.map((r) => r.field).sort(),
    ["address", "email", "phone", "social", "website"]
  );
  for (const r of results) {
    assert.ok(VERIFICABILI.includes(r.status), "stato non previsto: " + r.status);
    assert.ok(r.evidence.trim().length > 0, "spiegazione mancante per " + r.field);
    assert.ok(r.source.trim().length > 0, "fonte mancante per " + r.field);
  }
});

test("verifyLeadOffline: un lead vuoto non inventa nulla", () => {
  const results = verifyLeadOffline({});
  assert.equal(results.filter((r) => r.status === "verificato").length, 0);
  assert.equal(results.filter((r) => r.status === "assente").length, 4);
});

test("findDuplicateGroups: raggruppa stesso nome normalizzato e stessa citta", () => {
  const groups = findDuplicateGroups([
    { id: "1", name: "Trattoria Da Marco", city: "Feltre" },
    { id: "2", name: "trattoria da marco", city: "feltre" },
    { id: "3", name: "Trattoria Da Marco", city: "Belluno" },
    { id: "4", name: "Pizzeria Alfa", city: "Feltre" },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].leads.map((l) => l.id), ["1", "2"]);
});

test("findDuplicateGroups: nessun doppione quando non c'e", () => {
  assert.deepEqual(
    findDuplicateGroups([
      { id: "1", name: "Alfa", city: "Feltre" },
      { id: "2", name: "Beta", city: "Feltre" },
    ]),
    []
  );
});
