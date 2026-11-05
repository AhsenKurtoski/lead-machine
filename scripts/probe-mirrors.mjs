// scripts/probe-mirrors.mjs — cerca i mirror Overpass ancora vivi.
//
// L'elenco dei mirror pubblici cambia nel tempo: questo script interroga i
// candidati con la query reale dell'app e dice chi risponde, con che copertura
// (i mirror nazionali vedono solo il proprio paese) e in quanto tempo.
// Nessuna simulazione: o il servizio risponde, o lo si vede scritto qui.
//
// Uso: node scripts/probe-mirrors.mjs
import { userAgentFor } from "../src/lib/osm.ts";

const UA = userAgentFor();
// Feltre (Italia) e Zurigo (Svizzera): un mirror nazionale risponde solo a una
// delle due, e cosi' si vede subito quale.
const QUERY_IT =
  '[out:json][timeout:20];\nnwr(around:5000,46.0172,11.9069)["name"]["amenity"~"^(restaurant|cafe|bar)$"];\nout center tags;';
const QUERY_CH =
  '[out:json][timeout:20];\nnwr(around:5000,47.3769,8.5417)["name"]["amenity"~"^(restaurant|cafe|bar)$"];\nout center tags;';

const CANDIDATES = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass.osm.rambler.ru/cgi/interpreter",
  "https://overpass.osm.yandex.ru/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.osm.rambler.ru/cgi/interpreter",
  "https://overpass.openstreetmap.de/api/interpreter",
];

async function probe(url, query, timeoutMs = 15000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: "data=" + encodeURIComponent(query),
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* pagina di errore del mirror */
    }
    return {
      status: res.status,
      elements: Array.isArray(json?.elements) ? json.elements.length : null,
      remark: json?.remark ?? null,
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      status: 0,
      elements: null,
      remark: err.name === "AbortError" ? "timeout" : err.message,
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

console.log(`User-Agent: ${UA}\n`);
for (const url of [...new Set(CANDIDATES)]) {
  const it = await probe(url, QUERY_IT);
  const ch = await probe(url, QUERY_CH);
  const verdict =
    (it.elements ?? 0) > 0 && (ch.elements ?? 0) > 0
      ? "GLOBALE"
      : (it.elements ?? 0) > 0 || (ch.elements ?? 0) > 0
        ? "NAZIONALE"
        : it.status === 0 && ch.status === 0
          ? "MORTO"
          : "VUOTO/ERRORE";
  console.log(
    `${verdict.padEnd(13)} ${url}\n   IT: http=${it.status} el=${it.elements ?? "-"} ${it.ms}ms ${it.remark ?? ""}\n   CH: http=${ch.status} el=${ch.elements ?? "-"} ${ch.ms}ms ${ch.remark ?? ""}`
  );
}

// Il mirror principale e' anche il piu' sollecitato: un secondo giro dice se
// risponde in modo stabile o se alterna 504.
console.log("\n=== Stabilita' del mirror principale (overpass-api.de, 3 giri) ===");
for (let i = 1; i <= 3; i++) {
  const r = await probe("https://overpass-api.de/api/interpreter", QUERY_IT);
  console.log(`giro ${i}: http=${r.status} el=${r.elements ?? "-"} ${r.ms}ms ${r.remark ?? ""}`);
}
