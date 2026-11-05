// Test della terza fonte geografica (src/lib/tomtom.ts).
// Nessuna rete: si usa la forma di risposta documentata da TomTom per la
// Places Search API (Discover v3), cosi' il passaggio dati -> OsmCandidate e'
// verificato anche senza una chiave API.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  TOMTOM_ATTRIBUTES,
  TOMTOM_MAP,
  genericTomTomLabel,
  matchTomTomCategory,
  planTomTomRequests,
  toTomTomCandidate,
  type TomTomResult,
} from "./tomtom";
import { getCategoryById } from "./categories";

// Esempio della documentazione: un hotel (con telefono E sito) e un ristorante
// (solo telefono). Coordinate in [longitudine, latitudine].
const HOTEL: TomTomResult = {
  id: "i4gXDo36dRMSvuujipsMMA",
  title: "Nautilus Hotel & Restaurant",
  type: "poi",
  poiTypes: [{ id: "hotel", name: "Hotel", groupId: "lodging", role: "preferred", parentId: "hotel_or_motel" }],
  position: { coordinates: [13.463133, 54.327423], type: "Point" },
  address: {
    municipality: "Putbus",
    postalCode: "18581",
    street: "Neukamp",
    houseNumber: "17",
    country: "Germany",
  },
  contacts: [{ type: "default", phones: ["+49 38301 830"], websites: ["http://www.ruegen-nautilus.de"] }],
  distanceInMeters: 7557,
};

const RESTAURANT: TomTomResult = {
  id: "K4E4T-iOYZq6P-5HHG5dBA",
  title: "Restaurant In",
  type: "poi",
  poiTypes: [
    { id: "german_restaurant", name: "German Restaurant", groupId: "eat_and_drink", parentId: "restaurant" },
  ],
  position: { coordinates: [13.608475, 54.402262], type: "Point" },
  address: { municipality: "Binz", postalCode: "18609", street: "Wylichstraße", houseNumber: "9" },
  contacts: [{ type: "default", phones: ["+49 38393 31986"] }],
};

test("toTomTomCandidate: nome, coordinate, indirizzo e contatti diventano un candidato", () => {
  const c = toTomTomCandidate(HOTEL, ["hotel"], "hotel");
  assert.ok(c);
  assert.equal(c.name, "Nautilus Hotel & Restaurant");
  // Le coordinate di TomTom sono [longitudine, latitudine]: vanno invertite.
  assert.equal(c.lat, 54.327423);
  assert.equal(c.lng, 13.463133);
  assert.equal(c.city, "Putbus");
  assert.equal(c.postalCode, "18581");
  assert.equal(c.addressFull, "Neukamp 17");
  assert.equal(c.phone, "+49 38301 830");
  assert.equal(c.website, "http://www.ruegen-nautilus.de");
  assert.equal(c.hasWebsite, true);
  assert.equal(c.hasSocial, false);
  assert.equal(c.category, "hotel");
  assert.match(c.osmId, /^tomtom\//);
});

test("toTomTomCandidate: un candidato senza sito non ha un sito inventato", () => {
  const c = toTomTomCandidate(RESTAURANT, ["ristorante"], "ristorante");
  assert.ok(c);
  assert.equal(c.hasWebsite, false);
  assert.equal(c.website, undefined);
  assert.equal(c.email, undefined);
  assert.equal(c.instagram, undefined);
  assert.equal(c.phone, "+49 38393 31986");
  // Il tipo restituito e' un ristorante tedesco: il token "restaurant" combacia.
  assert.equal(c.category, "ristorante");
  assert.equal(c.categoryLabel, getCategoryById("ristorante")?.label);
});

test("toTomTomCandidate: la categoria richiesta resta anche se il tipo non e' riconosciuto", () => {
  // TomTom ha trovato questo posto per la ricerca di un fiorista ma il suo tipo
  // non e' nella nostra lista: si tiene (etichettato con la categoria chiesta),
  // perche' nascondere un'attivita' vera costa piu' di un lead da controllare.
  const sconosciuto: TomTomResult = {
    title: "Bottega Verde",
    position: { coordinates: [11.9, 46.01] },
    poiTypes: [{ id: "tipo_mai_visto", name: "Tipo Mai Visto" }],
    address: { municipality: "Feltre" },
  };
  const c = toTomTomCandidate(sconosciuto, ["fiorista"], "fiorista");
  assert.equal(c?.category, "fiorista");
});

test("toTomTomCandidate: senza categoria richiesta l'etichetta arriva dal tipo di POI", () => {
  const c = toTomTomCandidate(RESTAURANT, Object.keys(TOMTOM_MAP), null);
  assert.ok(c);
  assert.equal(c.category, "ristorante");
  assert.equal(genericTomTomLabel([{ id: "yoga_studio", name: "Yoga Studio" }]), "Yoga Studio");
  assert.equal(genericTomTomLabel([]), "Altro");
});

test("toTomTomCandidate: un risultato senza nome o senza coordinate valide non entra", () => {
  assert.equal(toTomTomCandidate({ position: { coordinates: [1, 2] } }, ["hotel"], "hotel"), null);
  assert.equal(toTomTomCandidate({ title: "X", position: { coordinates: [] } }, ["hotel"], "hotel"), null);
  // Coordinate non numeriche: l'API manda numeri, il codice non si fida lo stesso.
  const rotte = { title: "X", position: { coordinates: ["a", "b"] } } as unknown as TomTomResult;
  assert.equal(toTomTomCandidate(rotte, ["hotel"], "hotel"), null);
});

test("matchTomTomCategory: riconosce anche per nome, gruppo o tipo padre", () => {
  assert.equal(matchTomTomCategory([{ id: "german_restaurant", parentId: "restaurant" }], ["ristorante"], null)?.id, "ristorante");
  assert.equal(matchTomTomCategory([{ name: "Hairdresser" }], ["parrucchiere"], null)?.id, "parrucchiere");
  assert.equal(matchTomTomCategory([], ["parrucchiere"], null), null);
  assert.equal(matchTomTomCategory([], [], "dentista")?.id, "dentista");
});

test("planTomTomRequests: una richiesta per categoria, nessuna se la categoria non esiste", () => {
  const tutte = planTomTomRequests([]);
  assert.equal(tutte.length, 1);
  assert.equal(tutte[0].query, "");
  assert.equal(tutte[0].fallback, null);

  const due = planTomTomRequests(["ristorante", "parrucchiere"]);
  assert.equal(due.length, 2);
  assert.deepEqual(
    due.map((p) => p.query),
    ["restaurant", "hairdresser"]
  );
  // Il filtro `poiTypes` si usa dove l'id e' documentato...
  assert.deepEqual(due[0].poiTypes, ["restaurant"]);
  assert.deepEqual(due[1].poiTypes, ["hairdresser"]);
  // ...e si omette dove non lo e' (la ricerca per testo basta).
  assert.equal(planTomTomRequests(["fiorista"])[0].poiTypes, undefined);

  // Nessuna categoria valida fra quelle chieste: non si interroga l'API a vuoto.
  assert.deepEqual(planTomTomRequests(["categoria_inventata"]), []);
});

test("le categorie di TomTom sono categorie vere dell'app", () => {
  for (const id of Object.keys(TOMTOM_MAP)) {
    assert.ok(getCategoryById(id), `categoria sconosciuta nella mappa TomTom: ${id}`);
    assert.ok(TOMTOM_MAP[id].query.trim().length > 0, `ricerca vuota per ${id}`);
    assert.ok(TOMTOM_MAP[id].tokens.length > 0, `nessun token per ${id}`);
  }
});

test("TOMTOM_ATTRIBUTES chiede tutti i campi che leggiamo", () => {
  // Senza `Attributes` l'API non restituisce i campi richiesti: se qualcuno
  // aggiunge un campo letto dal mapper deve anche chiederlo qui.
  for (const campo of ["id", "title", "poiTypes", "position", "address", "contacts", "type"]) {
    assert.match(TOMTOM_ATTRIBUTES, new RegExp("\\b" + campo + "\\b"), `manca ${campo} negli Attributes`);
  }
});
