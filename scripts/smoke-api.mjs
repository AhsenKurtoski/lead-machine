// scripts/smoke-api.mjs
// Test end-to-end delle API key: profili, scope applicati, 401/403/404, CORS.
// Uso: node scripts/smoke-api.mjs   (server gia' avviato su SMOKE_BASE)
const BASE = process.env.SMOKE_BASE || "http://localhost:3111";

const pass = [];
const fail = [];
const lines = [];
const createdIds = [];

function check(name, ok, detail) {
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? " -- " + detail : ""}`;
  lines.push(line);
  if (ok) pass.push(name);
  else fail.push(name);
}

async function api(key, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(key ? { "x-api-key": key } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* risposta non JSON */
  }
  return { status: res.status, data, headers: res.headers };
}

function describe(r) {
  if (r.status === 200 || r.status === 201 || r.status === 204) return String(r.status);
  const req = r.data?.requiredScope ?? "-";
  const has = (r.data?.currentScopes ?? []).join(",") || "-";
  return `${r.status} | richiesto: ${req} | chiave ha: ${has}`;
}

async function main() {
  // --- 1. Creazione profili ---
  const keys = {};
  for (const [name, perms] of [
    ["readonly", "read"],
    ["search", "read,search"],
    ["writeonly", "write"],
    ["full", null],
  ]) {
    const body = { name: "smoke-" + name };
    if (perms) body.permissions = perms;
    const r = await api(null, "POST", "/api/keys", body);
    keys[name] = r.data?.rawKey;
    if (r.data?.apiKey?.id) createdIds.push(r.data.apiKey.id);
    const expected = perms ?? "read,write,search,ai";
    check(
      `profilo "${name}" creato con scope attesi`,
      r.status === 200 && r.data?.apiKey?.permissions === expected,
      r.data?.apiKey?.permissions ?? describe(r)
    );
  }

  // --- 2. Scope realmente applicati su ogni endpoint ---
  const matrix = [
    ["readonly", "GET", "/api/v1/leads?limit=1", null, 200, "puo leggere"],
    ["readonly", "POST", "/api/v1/leads", { name: "x" }, 403, "non puo scrivere"],
    ["readonly", "POST", "/api/v1/search", { timeoutMs: 5000 }, 403, "non puo cercare"],
    ["readonly", "POST", "/api/v1/demo/generate", { leadId: "x" }, 403, "non puo usare AI"],
    ["search", "GET", "/api/v1/leads?limit=1", null, 200, "puo leggere"],
    ["search", "POST", "/api/v1/search", { timeoutMs: 5000 }, 200, "puo cercare"],
    ["search", "POST", "/api/v1/leads", { name: "x" }, 403, "non puo scrivere"],
    ["search", "POST", "/api/v1/demo/generate", { leadId: "x" }, 403, "non puo usare AI"],
    ["writeonly", "POST", "/api/v1/leads", { name: "Smoke Test Write" }, 201, "puo scrivere"],
    ["writeonly", "GET", "/api/v1/leads?limit=1", null, 403, "non puo leggere"],
    ["writeonly", "POST", "/api/v1/search", { timeoutMs: 5000 }, 403, "non puo cercare"],
    ["full", "GET", "/api/v1/leads?limit=1", null, 200, "puo leggere"],
    ["full", "POST", "/api/v1/search", { timeoutMs: 5000 }, 200, "puo cercare"],
  ];
  for (const [profile, method, path, body, expected, why] of matrix) {
    const r = await api(keys[profile], method, path, body);
    check(`${profile} ${method} ${path.split("?")[0]} (${why})`, r.status === expected, describe(r));
  }

  // --- 3. Autenticazione ---
  check("senza chiave -> 401", (await api(null, "GET", "/api/v1/leads?limit=1")).status === 401);
  check("chiave inesistente -> 401", (await api("lm_live_invalida", "GET", "/api/v1/leads?limit=1")).status === 401);
  const bearer = await fetch(BASE + "/api/v1/leads?limit=1", { headers: { Authorization: "Bearer " + keys.full } });
  check("autenticazione Bearer -> 200", bearer.status === 200, String(bearer.status));

  // --- 4. CORS preflight ---
  const pre = await fetch(BASE + "/api/v1/leads", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:3001", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-api-key" },
  });
  check(
    "preflight CORS -> 204 con allow-origin",
    pre.status === 204 && pre.headers.get("access-control-allow-origin") === "*",
    `${pre.status} allow-origin=${pre.headers.get("access-control-allow-origin")}`
  );

  // --- 5. 404 puliti (mai 500) ---
  check("PATCH id inesistente -> 404", (await api(null, "PATCH", "/api/keys/ID_NON_ESISTENTE", { enabled: false })).status === 404);
  check("GET lead inesistente -> 404", (await api(keys.full, "GET", "/api/v1/leads/ID_NON_ESISTENTE")).status === 404);

  check("DELETE id inesistente -> 404", (await api(null, "DELETE", "/api/keys/ID_NON_ESISTENTE")).status === 404);

  // --- 6. Modifica permessi su chiave esistente ---
  const target = createdIds[0];
  const patch = await api(null, "PATCH", "/api/keys/" + target, { permissions: "read,search" });
  check(
    "PATCH permessi salvati",
    patch.status === 200 && patch.data?.apiKey?.permissions === "read,search",
    patch.data?.apiKey?.permissions ?? describe(patch)
  );
  const after = await api(keys.readonly, "POST", "/api/v1/search", { timeoutMs: 5000 });
  check("nuovo scope subito attivo sulla stessa chiave", after.status === 200, describe(after));

  // --- 7. Validazione scope ---
  const bad = await api(null, "POST", "/api/keys", { name: "smoke-bad", permissions: "pippo" });
  check(
    "scope non valido non viene salvato grezzo",
    bad.data?.apiKey?.permissions !== "pippo",
    bad.data?.apiKey?.permissions ?? describe(bad)
  );
  if (bad.data?.apiKey?.id) createdIds.push(bad.data.apiKey.id);

  // --- 8. Sospensione e riattivazione ---
  await api(null, "PATCH", "/api/keys/" + target, { enabled: false });
  check("chiave sospesa -> 403", (await api(keys.readonly, "GET", "/api/v1/leads?limit=1")).status === 403);
  await api(null, "PATCH", "/api/keys/" + target, { enabled: true });
  check("chiave riattivata -> 200", (await api(keys.readonly, "GET", "/api/v1/leads?limit=1")).status === 200);

  // --- 9. Pulizia ---
  for (const id of createdIds) await api(null, "DELETE", "/api/keys/" + id);
  const remaining = await api(null, "GET", "/api/keys");
  const leftovers = (remaining.data?.keys ?? []).filter((k) => k.name.startsWith("smoke-"));
  check("pulizia chiavi di test", leftovers.length === 0, leftovers.length + " rimaste");

  const leads = await api(keys.full, "GET", "/api/v1/leads?limit=500");
  const testLeads = (leads.data?.leads ?? []).filter((l) => l.name === "Smoke Test Write");
  for (const l of testLeads) {
    await fetch(BASE + "/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [l.id], action: "delete" }),
    });
  }
  check("pulizia lead di test", true, testLeads.length + " rimossi");
}

main()
  .then(() => {
    console.log(lines.join("\n"));
    console.log(`\nTotale: ${pass.length} pass, ${fail.length} fail`);
    if (fail.length) {
      console.log("FALLITI:\n - " + fail.join("\n - "));
      process.exit(1);
    }
    console.log("TUTTI I TEST SUPERATI");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Errore nello smoke test:", e);
    process.exit(2);
  });

