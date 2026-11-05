import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertPublicHttpUrl,
  isBlockedHostname,
  isPrivateAddress,
} from "./url-safety";

test("url-safety: blocks loopback, private and link-local addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("8.8.8.8"), false);
  assert.equal(isPrivateAddress("1.1.1.1"), false);
});

test("url-safety: blocks local hostnames and metadata suffixes", () => {
  for (const host of [
    "localhost",
    "app.localhost",
    "printer.local",
    "metadata.google.internal",
    "service.home.arpa",
    "127.0.0.1",
  ]) {
    assert.equal(isBlockedHostname(host), true, host);
  }
  assert.equal(isBlockedHostname("example.com"), false);
});

test("url-safety: only public http(s) URLs without credentials are allowed", async () => {
  await assert.rejects(
    assertPublicHttpUrl("http://127.0.0.1/admin"),
    /locale o privato|privato/
  );
  await assert.rejects(
    assertPublicHttpUrl("http://localhost/admin"),
    /locale o privato|privato/
  );
  await assert.rejects(
    assertPublicHttpUrl("http://169.254.169.254/latest/meta-data"),
    /locale o privato|privato/
  );
  await assert.rejects(assertPublicHttpUrl("file:///etc/passwd"), /http\/https/);
  await assert.rejects(
    assertPublicHttpUrl("https://user:pass@example.com/"),
    /credenziali/
  );

  // No DNS lookup here: the literal host must still pass the public checks.
  const url = await assertPublicHttpUrl("https://example.com/path", { resolveDns: false });
  assert.equal(url.hostname, "example.com");
});
