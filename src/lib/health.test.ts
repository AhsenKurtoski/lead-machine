import assert from "node:assert/strict";
import { test } from "node:test";

import {
  baseUrlNeedsHttps,
  isLocalHostname,
  isNodeSupported,
  summarizeHealth,
  type HealthCheck,
  type HealthSection,
} from "./health";

function section(id: string, ...checks: HealthCheck[]): HealthSection {
  return { id, title: id, checks };
}

test("health: Node requirement comparison", () => {
  assert.equal(isNodeSupported("18.18.0", ">=18.18.0"), true);
  assert.equal(isNodeSupported("18.18.1", ">=18.18.0"), true);
  assert.equal(isNodeSupported("20.0.0", ">=18.18.0"), true);
  assert.equal(isNodeSupported("24.1.0", ">=18.18.0"), true);
  assert.equal(isNodeSupported("18.17.9", ">=18.18.0"), false);
  assert.equal(isNodeSupported("16.20.0", ">=18.18.0"), false);
});

test("health: HTTPS warning only for public production URLs", () => {
  assert.equal(isLocalHostname("localhost"), true);
  assert.equal(isLocalHostname("app.localhost"), true);
  assert.equal(isLocalHostname("127.0.0.1"), true);
  assert.equal(isLocalHostname("127.0.1.1"), true);
  assert.equal(isLocalHostname("[::1]"), true);
  assert.equal(isLocalHostname("crm.example.com"), false);

  assert.equal(baseUrlNeedsHttps("http://localhost:3000", "production"), false);
  assert.equal(baseUrlNeedsHttps("http://127.0.0.1:3000", "production"), false);
  assert.equal(baseUrlNeedsHttps("http://crm.example.com", "production"), true);
  assert.equal(baseUrlNeedsHttps("https://crm.example.com", "production"), false);
  assert.equal(baseUrlNeedsHttps("http://crm.example.com", "development"), false);
  assert.equal(baseUrlNeedsHttps("not a URL", "production"), false);
});

test("health: summary is fail > warn > ok and ignores info for overall", () => {
  const okReport = summarizeHealth([
    section(
      "a",
      { id: "a1", label: "ok", status: "ok", detail: "" },
      { id: "a2", label: "info", status: "info", detail: "" }
    ),
  ]);
  assert.equal(okReport.overall, "ok");
  assert.deepEqual(okReport.summary, { ok: 1, warn: 0, fail: 0, info: 1 });

  const warnReport = summarizeHealth([
    section(
      "b",
      { id: "b1", label: "ok", status: "ok", detail: "" },
      { id: "b2", label: "warn", status: "warn", detail: "" }
    ),
  ]);
  assert.equal(warnReport.overall, "warn");

  const failReport = summarizeHealth([
    section(
      "c",
      { id: "c1", label: "fail", status: "fail", detail: "" },
      { id: "c2", label: "warn", status: "warn", detail: "" }
    ),
  ]);
  assert.equal(failReport.overall, "fail");
  assert.deepEqual(failReport.summary, { ok: 0, warn: 1, fail: 1, info: 0 });
});
