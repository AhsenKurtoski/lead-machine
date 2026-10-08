// scripts/smoke-geo.mjs — verifica end-to-end delle fonti geografiche REALI.
// Controlla che OpenStreetMap/Overpass e Geoapify rispondano davvero tramite
// le API dell'app, senza simulazioni.
// Uso: server avviato (es. npm start -- -p 3111), poi:
//   SMOKE_BASE=http://localhost:3111 node scripts/smoke-geo.mjs
const BASE = process.env.SMOKE_BASE || "http://localhost:3111";

const pass = [];
const fail = [];
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " -- " + detail : ""}`);
  (ok ? pass : fail).push(name);
}

// 1) Ricerca interna: risposta { ok, count, candidates, sources: {osm, geoapify, ai}, warnings }
const res = await fetch(BASE + "/api/ricerca", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    categories: ["ristorante"],
    radius_m: 5000,
    searchCity: "Feltre",
    useAi: false,
  }),
});
const data = await res.json().catch(() => ({}));
check("POST /api/ricerca risponde 200", res.status === 200, String(res.status));
check("la ricerca restituisce candidati", (data.count || 0) > 0, `count=${data.count}`);

const sources = data.sources || {};
check(
  "OpenStreetMap/Overpass ha restituito candidati reali",
  typeof sources.osm === "number" && sources.osm > 0,
  `osm=${sources.osm}`
);
check(
  "Geoapify ha restituito candidati reali",
  sources.geoapify === null || sources.geoapify > 0,
  `geoapify=${sources.geoapify === null ? "non configurato (ok)" : sources.geoapify}`
);
const warnings = data.warnings || [];
check(
  "nessun warning sulle fonti geografiche",
  warnings.filter((w) => /Overpass|OpenStreetMap|Geoapify/i.test(w)).length === 0,
  warnings.join(" | ") || "-"
);

const first = (data.candidates || [])[0];
if (first) console.log(`   esempio reale: ${first.name} @ ${first.lat},${first.lng}`);

// 2) API pubblica /api/v1/search con API key reale
// risposta { ok, count, area, timedOut, warnings, leads }
const keyRes = await fetch(BASE + "/api/keys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "smoke-geo", permissions: "read,search" }),
});
const keyData = await keyRes.json().catch(() => ({}));
const rawKey = keyData?.rawKey;
check("API key di test creata", Boolean(rawKey), String(keyRes.status));
if (rawKey) {
  const s = await fetch(BASE + "/api/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": rawKey },
    body: JSON.stringify({ categories: ["bar"], searchCity: "Feltre", radius: 3000 }),
  });
  const sd = await s.json().catch(() => ({}));
  check("POST /api/v1/search con chiave -> 200", s.status === 200, String(s.status));
  check("la ricerca pubblica trova attività reali", (sd.count || 0) > 0, `count=${sd.count}`);
  check("nessuna fonte in timeout", sd.timedOut === false, `timedOut=${sd.timedOut}`);
  await fetch(BASE + "/api/keys/" + keyData.apiKey.id, { method: "DELETE" });
  console.log("   chiave di test rimossa");
}

console.log(`\nTotale: ${pass.length} pass, ${fail.length} fail`);
if (fail.length) {
  console.log("FALLITI: " + fail.join(", "));
  process.exit(1);
}
console.log("GEO OK — fonti geografiche reali funzionanti");
