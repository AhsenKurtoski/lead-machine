import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSearchArea, type SearchAreaInput } from "./search-area";

const fakeGeocode = async (city: string) =>
  city.toLowerCase().includes("trovami")
    ? { lat: 46.0172, lng: 11.9069, displayName: "trovami" }
    : null;

function base(overrides: Partial<SearchAreaInput> = {}): SearchAreaInput {
  return { settings: {}, ...overrides };
}

// --- 1) Coordinate esplicite vincono su tutto ---

test("resolveSearchArea: lat/lng espliciti -> area dalla richiesta", async () => {
  const res = await resolveSearchArea(
    base({ lat: 45.4, lng: 9.1, city: "Milano", radiusM: 3000, settings: { search_city: "Roma" } }),
    fakeGeocode
  );
  assert.ok(res.area);
  assert.equal(res.area.source, "richiesta");
  assert.equal(res.area.lat, 45.4);
  assert.equal(res.area.radiusM, 3000);
});

test("resolveSearchArea: lat presente ma lng non valido -> non conta come coordinata", async () => {
  const res = await resolveSearchArea(
    base({ lat: 45.4, lng: "abc", city: "Citta Trovami", settings: {} }),
    fakeGeocode
  );
  assert.ok(res.area);
  assert.equal(res.area.source, "geocoding");
});

// --- 1b) Nessun valore vuoto e' una coordinata (mai una zona a 0,0) ---

test("resolveSearchArea: lat/lng a null non sono coordinate (nessuna zona a 0,0)", async () => {
  const res = await resolveSearchArea(
    base({ city: "Citta Trovami", lat: null, lng: null, settings: {} }),
    fakeGeocode
  );
  assert.ok(res.area);
  assert.equal(res.area.source, "geocoding");
  assert.equal(res.area.lat, 46.0172);
});

test("resolveSearchArea: coordinate vuote non contano, nemmeno quelle salvate", async () => {
  // Come arriva dalle variabili d'ambiente vuote o da un campo non compilato:
  // "" non deve diventare 0 (che e' un punto valido).
  const res = await resolveSearchArea(
    base({
      city: "Citta Trovami",
      lat: "",
      lng: "  ",
      settings: { search_city: "Citta Trovami", search_lat: "", search_lng: "" },
    }),
    fakeGeocode
  );
  assert.ok(res.area);
  assert.equal(res.area.source, "geocoding");
  assert.equal(res.area.lat, 46.0172);
});

test("resolveSearchArea: niente citta e coordinate vuote -> nessuna area (non 0,0)", async () => {
  const res = await resolveSearchArea(
    base({ lat: null, lng: null, settings: { search_lat: "", search_lng: "" } }),
    fakeGeocode
  );
  assert.equal(res.area, null);
  assert.ok(res.warning && res.warning.includes("non configurata"));
});

test("resolveSearchArea: citta salvata senza coordinate e geocoding fallito -> warning sulle coordinate", async () => {
  const res = await resolveSearchArea(
    base({ city: "Citta Sconosciuta", settings: { search_city: "Citta Sconosciuta" } }),
    fakeGeocode
  );
  assert.equal(res.area, null);
  assert.ok(res.warning && res.warning.includes("Coordinate non trovate"));
});

// --- 2) Geocoding della citta ---

test("resolveSearchArea: citta senza coordinate -> geocoding", async () => {
  const res = await resolveSearchArea(base({ city: "Citta Trovami" }), fakeGeocode);
  assert.ok(res.area);
  assert.equal(res.area.source, "geocoding");
  assert.equal(res.area.lat, 46.0172);
  assert.equal(res.area.city, "Citta Trovami");
});

test("resolveSearchArea: citta sconosciuta -> nessuna area, warning chiaro (nessuna coordinata inventata)", async () => {
  const res = await resolveSearchArea(base({ city: "Citta Sconosciuta" }), fakeGeocode);
  assert.equal(res.area, null);
  assert.ok(res.warning && res.warning.includes("Coordinate non trovate"));
});

// --- 3) Impostazioni salvate ---

test("resolveSearchArea: coordinate nelle impostazioni -> area dalle impostazioni", async () => {
  const res = await resolveSearchArea(
    base({ settings: { search_city: "Roma", search_lat: "41.9", search_lng: "12.5" } }),
    fakeGeocode
  );
  assert.ok(res.area);
  assert.equal(res.area.source, "impostazioni");
  assert.equal(res.area.lat, 41.9);
  assert.equal(res.area.city, "Roma");
});

test("resolveSearchArea: citta diversa dalle impostazioni -> geocoding, non le coordinate vecchie", async () => {
  const res = await resolveSearchArea(
    base({ city: "Citta Trovami", settings: { search_city: "Roma", search_lat: "41.9", search_lng: "12.5" } }),
    fakeGeocode
  );
  assert.ok(res.area);
  assert.equal(res.area.source, "geocoding");
});

test("resolveSearchArea: citta uguale alle impostazioni con coordinate -> niente rete, usa le impostazioni", async () => {
  let called = 0;
  const res = await resolveSearchArea(
    base({ city: "roma", settings: { search_city: "Roma", search_lat: "41.9", search_lng: "12.5" } }),
    async () => {
      called++;
      return null;
    }
  );
  assert.ok(res.area);
  assert.equal(res.area.source, "impostazioni");
  assert.equal(called, 0);
});

// --- 4) Nessuna area ---

test("resolveSearchArea: niente citta niente coordinate -> errore, nessun default", async () => {
  const res = await resolveSearchArea(base(), fakeGeocode);
  assert.equal(res.area, null);
  assert.ok(res.warning && res.warning.includes("non configurata"));
});

// --- raggio ---

test("resolveSearchArea: raggio di default 5000, personalizzabile da richiesta o impostazioni", async () => {
  const a = await resolveSearchArea(base({ lat: 1, lng: 2 }), fakeGeocode);
  assert.equal(a.area?.radiusM, 5000);
  const b = await resolveSearchArea(base({ lat: 1, lng: 2, settings: { search_radius_m: "9000" } }), fakeGeocode);
  assert.equal(b.area?.radiusM, 9000);
  assert.equal(typeof b.area?.radiusM, "number");
  const c = await resolveSearchArea(base({ lat: 1, lng: 2, radiusM: 1500, settings: { search_radius_m: "9000" } }), fakeGeocode);
  assert.equal(c.area?.radiusM, 1500);
});
