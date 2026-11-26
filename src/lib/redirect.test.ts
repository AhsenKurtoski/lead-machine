import assert from "node:assert/strict";
import { test } from "node:test";

import { safeNextPath } from "./auth";

test("safeNextPath: accetta solo percorsi interni", () => {
  // Percorsi legittimi: li lasciamo intatti (query inclusa).
  assert.equal(safeNextPath("/dashboard"), "/dashboard");
  assert.equal(safeNextPath("/contatti?tab=nuovi"), "/contatti?tab=nuovi");

  // URL esterni: `//host` e `/\host` sembrano percorsi ma il browser li
  // tratta come un altro sito. Devono tornare al fallback.
  assert.equal(safeNextPath("//evil.example"), "/dashboard");
  assert.equal(safeNextPath("/\\evil.example"), "/dashboard");
  assert.equal(safeNextPath("https://evil.example"), "/dashboard");
  assert.equal(safeNextPath("javascript:alert(1)"), "/dashboard");

  // Valori assenti o vuoti.
  assert.equal(safeNextPath(null), "/dashboard");
  assert.equal(safeNextPath(""), "/dashboard");

  // Fallback personalizzato (usato dai test e da eventuali altri flussi).
  assert.equal(safeNextPath("//evil.example", "/"), "/");
});
