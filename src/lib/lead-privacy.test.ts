import assert from "node:assert/strict";
import test from "node:test";
import { isEraseConfirmationValid } from "./lead-privacy";

// La conferma e' il gesto che distrugge una scheda: se questo confronto e'
// permissivo, un errore di battitura o un `true` inviato per sbaglio cancellano
// dati veri.

test("isEraseConfirmationValid: il nome esatto e' accettato", () => {
  assert.equal(isEraseConfirmationValid("Mario Rossi", "Mario Rossi"), true);
});

test("isEraseConfirmationValid: gli spazi esterni non contano", () => {
  assert.equal(isEraseConfirmationValid("Mario Rossi", "  Mario Rossi  "), true);
});

test("isEraseConfirmationValid: maiuscole diverse non sono una conferma", () => {
  assert.equal(isEraseConfirmationValid("Mario Rossi", "mario rossi"), false);
});

test("isEraseConfirmationValid: un nome parziale non basta", () => {
  assert.equal(isEraseConfirmationValid("Mario Rossi", "Mario"), false);
  assert.equal(isEraseConfirmationValid("Mario Rossi", "Mario Rossi Srl"), false);
});

test("isEraseConfirmationValid: booleani, null e oggetti sono rifiutati", () => {
  for (const value of [true, false, null, undefined, {}, [], 1]) {
    assert.equal(isEraseConfirmationValid("Mario Rossi", value), false, String(value));
  }
});

test("isEraseConfirmationValid: un lead senza nome non e' cancellabile cosi'", () => {
  assert.equal(isEraseConfirmationValid("   ", "   "), false);
  assert.equal(isEraseConfirmationValid("", ""), false);
});
