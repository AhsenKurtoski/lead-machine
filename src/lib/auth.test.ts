import assert from "node:assert/strict";
import { test } from "node:test";

import {
  authConfigured,
  createSessionToken,
  verifyPassword,
  verifySessionToken,
} from "./auth";

test("auth: password length, constant-time check and signed sessions", async (t) => {
  const previous = process.env.APP_PASSWORD;
  t.after(() => {
    if (previous === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = previous;
  });

  delete process.env.APP_PASSWORD;
  assert.equal(authConfigured(), false);
  assert.equal(await verifySessionToken(undefined), false);

  process.env.APP_PASSWORD = "short";
  assert.equal(authConfigured(), false);

  process.env.APP_PASSWORD = "correct-horse-battery";
  assert.equal(authConfigured(), true);
  assert.equal(verifyPassword("correct-horse-battery"), true);
  assert.equal(verifyPassword("wrong-password"), false);

  const token = await createSessionToken();
  assert.equal(await verifySessionToken(token), true);

  const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
  assert.equal(await verifySessionToken(tampered), false);
  assert.equal(await verifySessionToken("v1.9999999999999.invalid"), false);
  assert.equal(await verifySessionToken("not-a-token"), false);

  // Changing the password invalidates cookies issued under the old one.
  process.env.APP_PASSWORD = "another-long-password";
  assert.equal(await verifySessionToken(token), false);
});
