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

// Nome dei lead creati dallo script: serve a ripulire anche i residui di una
// run interrotta nelle esecuzioni successive.
const TEST_LEAD_NAME = "Smoke Test Write";

// Cancella dei lead tramite l'endpoint interno (nessuna chiave API necessaria).
async function deleteLeads(ids) {
  if (!ids.length) return { status: 0, data: null };
  return api(null, "POST", "/api/leads/bulk", { ids, action: "delete" });
}

// Elenca i lead dal database locale (endpoint interno, non la v1 con chiave).
async function localLeads(name) {
  const r = await api(null, "GET", "/api/leads");
  const all = r.data?.leads ?? [];
  return name ? all.filter((l) => l.name === name) : all;
}

async function main() {
  // --- 0. Pulizia dei residui ---
  // Se una run precedente e' stata interrotta a meta', le chiavi di test
  // restano nel database: si cancellano qui, cosi' il controllo finale parla
  // solo di quello che questo script ha creato.
  const before = await api(null, "GET", "/api/keys");
  const stale = (before.data?.keys ?? []).filter((k) => k.name.startsWith("smoke-"));
  for (const k of stale) await api(null, "DELETE", "/api/keys/" + k.id);
  if (stale.length) lines.push(`INFO  rimossi ${stale.length} residui di run interrotte`);

  // Stesso discorso per i lead di test: le run precedenti (o interrotte) ne
  // lasciano uno ciascuna. Si cancellano qui, cosi' il controllo finale misura
  // solo quello che questo script ha creato davvero.
  const staleLeads = await localLeads(TEST_LEAD_NAME);
  if (staleLeads.length) {
    await deleteLeads(staleLeads.map((l) => l.id));
    lines.push(`INFO  rimossi ${staleLeads.length} lead residui di run interrotte`);
  }

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
    ["readonly", "POST", "/api/v1/search", { timeoutMs: 5000, lat: 45.4642, lng: 9.19 }, 403, "non puo cercare"],
    ["readonly", "POST", "/api/v1/demo/generate", { leadId: "x" }, 403, "non puo usare AI"],
    ["search", "GET", "/api/v1/leads?limit=1", null, 200, "puo leggere"],
    ["search", "POST", "/api/v1/search", { timeoutMs: 5000, lat: 45.4642, lng: 9.19 }, 200, "puo cercare"],
    ["search", "POST", "/api/v1/leads", { name: "x" }, 403, "non puo scrivere"],
    ["search", "POST", "/api/v1/demo/generate", { leadId: "x" }, 403, "non puo usare AI"],
    ["writeonly", "POST", "/api/v1/leads", { name: "Smoke Test Write" }, 201, "puo scrivere"],
    ["writeonly", "GET", "/api/v1/leads?limit=1", null, 403, "non puo leggere"],
    ["writeonly", "POST", "/api/v1/search", { timeoutMs: 5000, lat: 45.4642, lng: 9.19 }, 403, "non puo cercare"],
    ["full", "GET", "/api/v1/leads?limit=1", null, 200, "puo leggere"],
    ["full", "POST", "/api/v1/search", { timeoutMs: 5000, lat: 45.4642, lng: 9.19 }, 200, "puo cercare"],
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
  const after = await api(keys.readonly, "POST", "/api/v1/search", { timeoutMs: 5000, lat: 45.4642, lng: 9.19 });
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
  // Prima i lead: per elencarli serve ancora una chiave valida (la v1 e' protetta
  // da API key, l'endpoint interno no). Cancellare le chiavi per prime faceva
  // fallire l'elenco con 401, quindi la pulizia non cancellava nulla.
  let removedLeads = 0;
  const listed = await api(keys.full, "GET", "/api/v1/leads?limit=500");
  const testLeads = (listed.data?.leads ?? []).filter((l) => l.name === TEST_LEAD_NAME);
  if (testLeads.length) {
    const deleted = await deleteLeads(testLeads.map((l) => l.id));
    removedLeads = deleted.data?.deleted ?? 0;
  }
  const leftLeads = await localLeads(TEST_LEAD_NAME);
  check(
    "pulizia lead di test",
    leftLeads.length === 0,
    `${removedLeads} rimossi, ${leftLeads.length} rimasti`
  );

  // Poi le chiavi.
  for (const id of createdIds) await api(null, "DELETE", "/api/keys/" + id);
  const remaining = await api(null, "GET", "/api/keys");
  const leftovers = (remaining.data?.keys ?? []).filter((k) => k.name.startsWith("smoke-"));
  check("pulizia chiavi di test", leftovers.length === 0, leftovers.length + " rimaste");
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

