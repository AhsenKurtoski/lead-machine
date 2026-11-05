// scripts/probe-overpass.mjs — sonda i servizi gratuiti che l'app usa davvero.
//
// Serve a rispondere a una domanda concreta: "le fonti funzionano ancora?".
// Interroga ogni mirror Overpass e ogni geocoder con lo STESSO User-Agent e la
// STESSA query dell'app, e stampa stato HTTP, elementi restituiti e tempo.
// Nessuna simulazione: o il servizio risponde, o lo si vede scritto qui.
//
// Uso: node scripts/probe-overpass.mjs
import { osmUserAgent, osmContactEmail, osmUrlWithContact } from "../src/lib/osm.ts";

const UA = osmUserAgent();
const CONTACT = osmContactEmail();
console.log(`User-Agent: ${UA}`);
console.log(`Contatto:   ${CONTACT ?? "(nessuno: si usa l'URL del progetto)"}\n`);

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// La stessa forma di query usata da runOverpassSearch (vincolo spaziale prima dei tag).
const QUERY =
  '[out:json][timeout:20];\n(\n' +
  '  nwr(around:5000,46.0172,11.9069)["name"]["amenity"~"^(restaurant|cafe|bar)$"];\n' +
  ");\nout center tags;";

async function probeOverpass(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: "data=" + encodeURIComponent(QUERY),
      signal: AbortSignal.timeout(25000),
    });
    const ms = Date.now() - started;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* pagina di errore del mirror */
    }
    const elements = Array.isArray(json?.elements) ? json.elements.length : null;
    const note = json?.remark ? "remark: " + json.remark : elements === null ? text.slice(0, 60).replace(/\s+/g, " ") : "";
    return { ok: res.ok && elements !== null, status: res.status, elements, ms, note };
  } catch (err) {
    return { ok: false, status: 0, elements: null, ms: Date.now() - started, note: err.message };
  }
}

console.log("=== Overpass (query reale dell'app: nwr around 5 km da Feltre) ===");
for (const url of OVERPASS) {
  const r = await probeOverpass(url);
  const mark = r.ok && (r.elements ?? 0) > 0 ? "OK  " : r.ok ? "VUOTO" : "KO  ";
  console.log(
    `${mark} ${url}\n     http=${r.status} elementi=${r.elements ?? "-"} ${r.ms}ms ${r.note}`
  );
}

// Nominatim: con il contatto segnaposto risponde 403 "Access denied", quindi
// il test verifica anche che l'URL costruito dall'app non contenga email finte.
console.log("\n=== Geocoding: Nominatim ===");
const nomUrl = osmUrlWithContact(
  "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent("Feltre")
);
try {
  const res = await fetch(nomUrl, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  let first = null;
  try {
    first = JSON.parse(text)?.[0] ?? null;
  } catch {
    /* risposta non JSON */
  }
  console.log(
    `http=${res.status} ${first ? `-> ${first.display_name} (${first.lat},${first.lon})` : "-> " + text.slice(0, 80)}`
  );
} catch (err) {
  console.log(`errore: ${err.message}`);
}

console.log("\n=== Geocoding: ripiego Photon (nessuna chiave) ===");
try {
  const res = await fetch("https://photon.komoot.io/api/?limit=1&q=" + encodeURIComponent("Feltre"), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => null);
  const f = json?.features?.[0];
  const c = f?.geometry?.coordinates;
  console.log(
    `http=${res.status} ${f ? `-> ${f.properties?.name} (${c?.[1]},${c?.[0]})` : "-> nessun risultato"}`
  );
} catch (err) {
  console.log(`errore: ${err.message}`);
}
