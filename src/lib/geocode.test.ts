import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGeocodeResults, parsePhotonResults } from "./geocode";

// --- parseGeocodeResults: funzione pura, nessuna rete ---

test("parseGeocodeResults: primo risultato valido -> coordinate e nome", () => {
  const point = parseGeocodeResults([
    { lat: "46.0172", lon: "11.9069", display_name: "Feltre, Belluno, Veneto, Italia" },
    { lat: "1", lon: "2", display_name: "altro" },
  ]);
  assert.ok(point);
  assert.equal(point.lat, 46.0172);
  assert.equal(point.lng, 11.9069);
  assert.equal(point.displayName, "Feltre, Belluno, Veneto, Italia");
});

test("parseGeocodeResults: lista vuota o non lista -> null", () => {
  assert.equal(parseGeocodeResults([]), null);
  assert.equal(parseGeocodeResults(null), null);
  assert.equal(parseGeocodeResults({}), null);
  assert.equal(parseGeocodeResults("x"), null);
});

test("parseGeocodeResults: coordinate non numeriche -> null (nessuna coordinata inventata)", () => {
  assert.equal(parseGeocodeResults([{ lat: "abc", lon: "11.9", display_name: "x" }]), null);
  assert.equal(parseGeocodeResults([{ lat: "46.1", display_name: "senza lon" }]), null);
});

test("parseGeocodeResults: displayName mancante -> stringa vuota, coordinate valide", () => {
  const point = parseGeocodeResults([{ lat: "45", lon: "9" }]);
  assert.ok(point);
  assert.equal(point.displayName, "");
  assert.equal(point.areaLabel, null);
});

test("parseGeocodeResults: la provincia arriva dall'indirizzo strutturato (county)", () => {
  // Risposta reale di Nominatim (jsonv2 + addressdetails) per Feltre: il nome
  // esteso NON contiene "Provincia di", quindi l'etichetta dell'area va presa
  // dall'indirizzo strutturato invece che da una regex sul nome.
  const point = parseGeocodeResults([
    {
      lat: "46.0463692",
      lon: "11.9323564",
      display_name: "Feltre, Belluno, Veneto, 32032, Italia",
      address: { city: "Feltre", county: "Belluno", state: "Veneto", postcode: "32032", country: "Italia" },
    },
  ]);
  assert.ok(point);
  assert.equal(point.areaLabel, "Belluno");
});

test("parseGeocodeResults: senza indirizzo strutturato l'etichetta dell'area resta vuota", () => {
  const point = parseGeocodeResults([{ lat: "45", lon: "9", display_name: "Un Posto" }]);
  assert.ok(point);
  assert.equal(point.areaLabel, null);
});

// --- parsePhotonResults: il geocoder di ripiego (GeoJSON, coordinate invertite) ---

test("parsePhotonResults: primo risultato valido -> coordinate invertite e provincia dal county", () => {
  const point = parsePhotonResults({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Feltre", county: "Belluno", state: "Veneto", country: "Italia" },
        geometry: { type: "Point", coordinates: [11.9069, 46.0172] },
      },
    ],
  });
  assert.ok(point);
  assert.equal(point.lat, 46.0172);
  assert.equal(point.lng, 11.9069);
  assert.equal(point.areaLabel, "Belluno");
  assert.equal(point.displayName, "Feltre, Belluno, Veneto, Italia");
});

test("parsePhotonResults: il nome ripetuto (comune = citta) non viene duplicato", () => {
  const point = parsePhotonResults({
    features: [
      {
        properties: { name: "Milano", city: "Milano", county: "Milano", state: "Lombardia" },
        geometry: { coordinates: [9.19, 45.4642] },
      },
    ],
  });
  assert.ok(point);
  assert.equal(point.displayName, "Milano, Lombardia");
});

test("parsePhotonResults: risposta vuota o malformata -> null (nessuna coordinata inventata)", () => {
  assert.equal(parsePhotonResults(null), null);
  assert.equal(parsePhotonResults({}), null);
  assert.equal(parsePhotonResults({ features: [] }), null);
  assert.equal(parsePhotonResults({ features: [{}] }), null);
  assert.equal(parsePhotonResults({ features: [{ geometry: { coordinates: [11.9] } }] }), null);
  assert.equal(
    parsePhotonResults({ features: [{ geometry: { coordinates: ["abc", "def"] } }] }),
    null
  );
});

test("parsePhotonResults: senza county l'etichetta dell'area resta vuota", () => {
  const point = parsePhotonResults({
    features: [{ properties: { name: "Un Posto" }, geometry: { coordinates: [9, 45] } }],
  });
  assert.ok(point);
  assert.equal(point.areaLabel, null);
  assert.equal(point.displayName, "Un Posto");
});
