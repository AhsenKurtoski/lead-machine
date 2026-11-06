import assert from "node:assert/strict";
import { test } from "node:test";

import { API_SCOPES, DEFAULT_NEW_KEY_SCOPES, scopesForNewKey } from "./api-auth";

test("new API keys are read-only when permissions are omitted", () => {
  assert.deepEqual([...DEFAULT_NEW_KEY_SCOPES], ["read"]);
  assert.deepEqual(scopesForNewKey(undefined), ["read"]);
  assert.deepEqual(scopesForNewKey(null), ["read"]);
  assert.deepEqual(scopesForNewKey(""), ["read"]);
  assert.deepEqual(scopesForNewKey("   "), ["read"]);
});

test("new API keys never gain write/search/ai implicitly", () => {
  assert.deepEqual(scopesForNewKey("boh"), []);
  assert.deepEqual(scopesForNewKey("read"), ["read"]);
  assert.equal(scopesForNewKey(undefined).includes("write"), false);
  assert.equal(scopesForNewKey(undefined).includes("search"), false);
  assert.equal(scopesForNewKey(undefined).includes("ai"), false);
});

test("explicit valid scopes are preserved", () => {
  assert.deepEqual(scopesForNewKey(" read , search "), ["read", "search"]);
  assert.deepEqual(scopesForNewKey("read,write,search,ai"), [...API_SCOPES]);
  assert.deepEqual(scopesForNewKey("admin"), [...API_SCOPES]);
});
