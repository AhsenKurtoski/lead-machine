// Test della risoluzione dell'area allargata (src/lib/province-area.ts).
// Nessuna rete: la query e il parsing sono puri, e l'esecutore di Overpass
// viene iniettato come parametro, come per il geocoder in search-area.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AREA_FALLBACK_RADIUS_M,
  MAX_AREA_CENTERS,
  MAX_PROVINCE_COMUNI,
  buildProvinceComuniQuery,
  buildRadiusComuniQuery,
  comuneKey,
  distanceKm,
  findProvinceComuni,
  parseProvinceComuni,
  provinceFromDisplayName,
  RADIUS_PRESETS,
} from "./province-area";

// Forma reale della risposta di Overpass (nodi + way con `center`).
const OVERPASS_REPLY = [
  { type: "node", id: 1, lat: 46.1428, lon: 12.2156, tags: { place: "town", name: "Belluno" } },
  { type: "node", id: 2, lat: 46.0172, lon: 11.91, tags: { place: "town", name: "Feltre" } },
  { type: "way", id: 3, center: { lat: 46.1167, lon: 12.0972 }, tags: { place: "village", name: "Sedico" } },
  // Doppione dello stesso comune con accenti/maiuscole diverse.
  { type: "node", id: 4, lat: 46.0172, lon: 11.91, tags: { place: "town", name: "FELTRE" } },
  // Voci da scartare: senza nome, senza coordinate, senza tag.
  { type: "node", id: 5, lat: 46.1, lon: 12.1, tags: { place: "village" } },
  { type: "node", id: 6, tags: { place: "town", name: "SenzaCoordinate" } },
  null,
];

test("province-area: la query cerca i comuni nell'area amministrativa che contiene il punto", () => {
  const q = buildProvinceComuniQuery(46.0172, 11.91);
  assert.match(q, /is_in\(46\.01720,11\.91000\)/);
  assert.match(q, /admin_level"="6/);
  assert.match(q, /place"~"\^\(city\|town\|village\)\$"/);
  assert.match(q, new RegExp("out center " + MAX_PROVINCE_COMUNI));
  // Nessun nome di provincia o di comune scritto nella query.
  assert.equal(/Belluno|Feltre|provincia di/i.test(q), false);
});

test("province-area: coordinate non valide -> errore chiaro, non una query su (0,0)", () => {
  assert.throws(() => buildProvinceComuniQuery(Number.NaN, 11.9), /Coordinate non valide/);
  assert.throws(() => buildProvinceComuniQuery(46.01, Number.POSITIVE_INFINITY), /Coordinate non valide/);
});

test("province-area: il limite dei comuni e ragionevole e non supera i 500", () => {
  assert.match(buildProvinceComuniQuery(45.4, 9.1, 0), new RegExp("out center " + MAX_PROVINCE_COMUNI));
  assert.match(buildProvinceComuniQuery(45.4, 9.1, 9999), /out center 500/);
  assert.match(buildProvinceComuniQuery(45.4, 9.1, 12), /out center 12/);
});

test("province-area: parse scarta voci incomplete, unisce i doppioni e mette davanti i piu vicini", () => {
  const comuni = parseProvinceComuni(OVERPASS_REPLY, { lat: 46.0172, lng: 11.91 });
  assert.deepEqual(
    comuni.map((c) => c.name),
    ["Feltre", "Sedico", "Belluno"],
    "Feltre e' a 0 km, poi Sedico, poi Belluno"
  );
  assert.equal(comuni.length, 3, "il doppione FELTRE/Feltre e le voci incomplete non contano");
  assert.equal(comuni[0].lat, 46.0172);
  assert.equal(comuni[0].lng, 11.91);
});

test("province-area: risposta vuota o malformata -> nessun comune, nessuna invenzione", () => {
  assert.deepEqual(parseProvinceComuni([]), []);
  assert.deepEqual(parseProvinceComuni(null), []);
  assert.deepEqual(parseProvinceComuni("errore html"), []);
});

test("province-area: il limite dei risultati e rispettato (0 o assente = default)", () => {
  assert.equal(parseProvinceComuni(OVERPASS_REPLY, undefined, 1).length, 1);
  assert.equal(parseProvinceComuni(OVERPASS_REPLY, undefined, 2).length, 2);
  assert.equal(parseProvinceComuni(OVERPASS_REPLY, undefined, 0).length, 3);
});

test("province-area: senza centro i comuni sono ordinati per nome", () => {
  const comuni = parseProvinceComuni(OVERPASS_REPLY);
  assert.deepEqual(comuni.map((c) => c.name), ["Belluno", "Feltre", "Sedico"]);
});

test("province-area: comuneKey normalizza accenti, maiuscole e spazi", () => {
  assert.equal(comuneKey("Citta'"), comuneKey("citta'"));
  assert.equal(comuneKey("  Borgo   Valbelluna "), "borgo valbelluna");
  assert.equal(comuneKey("Città"), "citta");
});

test("province-area: il nome dell'area viene letto dal geocoding, non dal codice", () => {
  assert.equal(provinceFromDisplayName("Feltre, Provincia di Belluno, Veneto, Italia"), "Belluno");
  assert.equal(
    provinceFromDisplayName("Milano, Città Metropolitana di Milano, Lombardia, Italia"),
    "Milano"
  );
  assert.equal(provinceFromDisplayName("Cortina d'Ampezzo, Provincia di Belluno, Veneto, Italia"), "Belluno");
  assert.equal(provinceFromDisplayName("Roma, Roma, Lazio, Italia"), null);
  assert.equal(provinceFromDisplayName(""), null);
});

test("province-area: findProvinceComuni usa l'esecutore iniettato e non inventa risultati", async () => {
  const calls: string[] = [];
  const ok = await findProvinceComuni(46.0172, 11.91, async (q) => {
    calls.push(q);
    return OVERPASS_REPLY;
  });
  assert.equal(calls.length, 1, "i confini rispondono: la query dei comuni intorno non serve");
  assert.match(calls[0], /is_in\(46\.01720,11\.91000\)/);
  assert.equal(
    calls.filter((q) => /around:40000/.test(q)).length,
    0,
    "una richiesta alla volta: nessuna query in piu' al mirror"
  );
  assert.equal(ok.comuni.length, 3);
  assert.equal(ok.warning, null, "con i confini disponibili non serve nessun avviso");

  const empty = await findProvinceComuni(46.0172, 11.91, async () => []);
  assert.deepEqual(empty.comuni, []);
  assert.match(empty.warning ?? "", /solo la citta scelta|non ha restituito/);

  const broken = await findProvinceComuni(46.0172, 11.91, async () => {
    throw new Error("Overpass 504");
  });
  assert.deepEqual(broken.comuni, []);
  assert.match(broken.warning ?? "", /Overpass|sovraccarico/);
  assert.match(broken.warning ?? "", /504/);
});

test("province-area: la query di ripiego non usa le aree amministrative (regge sui mirror senza indice aree)", () => {
  const q = buildRadiusComuniQuery(46.0172, 11.91);
  assert.match(q, /node\(around:40000,46\.01720,11\.91000\)/);
  assert.equal(/is_in/i.test(q), false);
  assert.match(q, /place"~"\^\(city\|town\|village\)\$"/);
  assert.match(q, new RegExp("out center " + MAX_PROVINCE_COMUNI));
  // Raggio sempre entro limiti sensati, anche con valori assurdi.
  assert.match(buildRadiusComuniQuery(46.01, 11.9, 0), /around:40000,/);
  assert.match(buildRadiusComuniQuery(46.01, 11.9, 999_999), /around:200000,/);
  assert.equal(AREA_FALLBACK_RADIUS_M, 40_000);
});

test("province-area: se i confini non sono disponibili si ripiega sui comuni intorno e lo dice", async () => {
  const queries: string[] = [];
  const area = await findProvinceComuni(46.0172, 11.91, async (q) => {
    queries.push(q);
    if (q.includes("is_in")) throw new Error("Overpass 504");
    return OVERPASS_REPLY;
  });
  assert.equal(queries.length, 2, "prima i confini, poi il ripiego");
  assert.equal(area.comuni.length, 3);
  assert.match(area.warning ?? "", /entro 40 km/);
  assert.deepEqual(area.comuni.map((c) => c.name), ["Feltre", "Sedico", "Belluno"]);
});

test("province-area: se falliscono sia i confini sia il ripiego, nessun comune e un avviso chiaro", async () => {
  const area = await findProvinceComuni(46.0172, 11.91, async (q) => {
    throw new Error("Overpass 504 (" + (q.includes("is_in") ? "confini" : "raggio") + ")");
  });
  assert.deepEqual(area.comuni, []);
  assert.match(area.warning ?? "", /sovraccarico|irraggiungibile/);
  assert.match(area.warning ?? "", /504/);
});

test("province-area: con i due risultati disponibili vince la provincia, non il raggio", async () => {
  const daRaggio = [
    { type: "node", id: 11, lat: 46.05, lon: 11.95, tags: { place: "village", name: "ComuneVicino" } },
  ];
  const area = await findProvinceComuni(46.0172, 11.91, async (q) =>
    /is_in/.test(q) ? OVERPASS_REPLY : daRaggio
  );
  assert.deepEqual(area.comuni.map((c) => c.name), ["Feltre", "Sedico", "Belluno"]);
  assert.equal(area.warning, null);
});

test("province-area: i centri di ricerca dell'area restano in un numero sostenibile", () => {
  // Un centro = una interrogazione a Overpass dentro un budget di ~100s.
  assert.ok(MAX_AREA_CENTERS >= 5 && MAX_AREA_CENTERS <= 30, "valore: " + MAX_AREA_CENTERS);
  const comuni = parseProvinceComuni(OVERPASS_REPLY, { lat: 46.0172, lng: 11.91 });
  assert.deepEqual(
    comuni.slice(0, MAX_AREA_CENTERS).map((c) => c.name),
    ["Feltre", "Sedico", "Belluno"],
    "i centri usati sono i comuni piu vicini, non i primi arrivati"
  );
});

test("province-area: distanza e raggi disponibili", () => {
  const km = distanceKm({ lat: 46.0172, lng: 11.91 }, { lat: 46.1428, lng: 12.2156 });
  assert.ok(km > 20 && km < 30, "Feltre-Belluno sono circa 25 km, misurati: " + km.toFixed(1));
  assert.equal(distanceKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 }), 0);
  assert.deepEqual(RADIUS_PRESETS.map((r) => r.value), [5000, 10000, 20000, 35000]);
});
