import assert from "node:assert/strict";
import { test } from "node:test";

import { checkRateLimit, clientFingerprint } from "./security";

function withEnv(vars: Record<string, string | undefined>, run: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const UA = "test-agent";

test("il limiter in memoria blocca dopo il massimo e isola le chiavi", () => {
  const key = `test:${Math.random()}`;
  assert.equal(checkRateLimit(key, 2, 60_000).blocked, false);
  assert.equal(checkRateLimit(key, 2, 60_000).blocked, false);
  const third = checkRateLimit(key, 2, 60_000);
  assert.equal(third.blocked, true);
  assert.equal(third.remaining, 0);
  assert.equal(checkRateLimit(`${key}:altro`, 2, 60_000).blocked, false);
});

test("il limiter in memoria riapre la finestra dopo la scadenza", async () => {
  const key = `test-reset:${Math.random()}`;
  assert.equal(checkRateLimit(key, 1, 20).blocked, false);
  assert.equal(checkRateLimit(key, 1, 20).blocked, true);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(checkRateLimit(key, 1, 20).blocked, false);
});

test("senza proxy fidato X-Forwarded-For non cambia il fingerprint", () => {
  withEnv({ TRUST_PROXY: undefined, CLOUDFLARE_WORKERS: undefined, DATABASE_PROVIDER: undefined }, () => {
    const a = clientFingerprint(new Request("https://app.test/", { headers: { "user-agent": UA, "x-forwarded-for": "1.1.1.1" } }), "auth:login");
    const b = clientFingerprint(new Request("https://app.test/", { headers: { "user-agent": UA, "x-forwarded-for": "2.2.2.2" } }), "auth:login");
    assert.equal(a, b);
  });
});

test("dietro un proxy fidato client diversi hanno fingerprint diversi", () => {
  withEnv({ TRUST_PROXY: "1", CLOUDFLARE_WORKERS: undefined, DATABASE_PROVIDER: undefined }, () => {
    const a = clientFingerprint(new Request("https://app.test/", { headers: { "user-agent": UA, "x-forwarded-for": "1.1.1.1" } }), "auth:login");
    const b = clientFingerprint(new Request("https://app.test/", { headers: { "user-agent": UA, "x-forwarded-for": "2.2.2.2" } }), "auth:login");
    assert.notEqual(a, b);
  });
});

test("su Cloudflare l'IP viene da CF-Connecting-IP e non da X-Forwarded-For", () => {
  withEnv({ TRUST_PROXY: undefined, CLOUDFLARE_WORKERS: "1", DATABASE_PROVIDER: undefined }, () => {
    const a = clientFingerprint(
      new Request("https://app.test/", {
        headers: { "user-agent": UA, "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" },
      }),
      "auth:login"
    );
    const b = clientFingerprint(
      new Request("https://app.test/", {
        headers: { "user-agent": UA, "cf-connecting-ip": "2.2.2.2", "x-forwarded-for": "1.1.1.1" },
      }),
      "auth:login"
    );
    assert.notEqual(a, b);
    const spoofA = clientFingerprint(
      new Request("https://app.test/", { headers: { "user-agent": UA, "x-forwarded-for": "1.1.1.1" } }),
      "auth:login"
    );
    const spoofB = clientFingerprint(
      new Request("https://app.test/", { headers: { "user-agent": UA, "x-forwarded-for": "2.2.2.2" } }),
      "auth:login"
    );
    assert.equal(spoofA, spoofB);
  });
});
