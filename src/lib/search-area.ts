// ============================================================
// Risoluzione dell'area di ricerca.
//
// Nessuna citta o coordinata di default nel codice. L'area viene
// decisa in questo ordine:
//   1. coordinate esplicite nella richiesta (lat/lng);
//   2. geocoding della citta scelta (richiesta o impostazioni);
//   3. coordinate salvate nelle impostazioni (search_lat/search_lng);
//   4. nessuna area: il chiamante riceve un errore chiaro.
// Il geocoder e' iniettabile, cosi i test girano offline.
// ============================================================

import { geocodeCity, type GeoPoint } from "./geocode";

export type SearchArea = {
  city: string;
  lat: number;
  lng: number;
  radiusM: number;
  source: "richiesta" | "impostazioni" | "geocoding";
};

export type SearchAreaResult = {
  area: SearchArea | null;
  warning: string | null;
};

export type SearchAreaInput = {
  city?: string | null;
  lat?: unknown;
  lng?: unknown;
  radiusM?: number | null;
  settings: Record<string, string | undefined>;
  defaultRadiusM?: number;
  /** Email facoltativa da mandare al geocoder (identificazione policy OSM). */
  contactEmail?: string | null;
};

/**
 * Numero finito dal valore grezzo, oppure `null` se non c'e' un numero.
 *
 * `null`, `undefined`, `""` e le stringhe di soli spazi valgono `null`: non
 * sono coordinate. Senza questo controllo `Number(null)` e `Number("")`
 * avrebbero dato `0`, trasformando un "nessuna coordinata" in un punto
 * valido a (0,0) — cioe' una zona di ricerca inventata nel Golfo di Guinea.
 */
function toFinite(n: unknown): number | null {
  if (n == null) return null;
  if (typeof n === "string" && n.trim() === "") return null;
  const v = typeof n === "number" ? n : Number(String(n).trim());
  return Number.isFinite(v) ? v : null;
}

export async function resolveSearchArea(
  input: SearchAreaInput,
  geocode: (city: string, contact?: string | null) => Promise<GeoPoint | null> = geocodeCity
): Promise<SearchAreaResult> {
  const settingsCity = (input.settings.search_city ?? "").trim();
  const city = (input.city ?? "").trim() || settingsCity;

  const askedRadius = toFinite(input.radiusM);
  const savedRadius = toFinite(input.settings.search_radius_m);
  const radiusM =
    askedRadius !== null && askedRadius > 0
      ? askedRadius
      : savedRadius !== null && savedRadius > 0
        ? savedRadius
        : input.defaultRadiusM ?? 5000;

  // 1) Coordinate esplicite: vincono su tutto.
  const reqLat = toFinite(input.lat);
  const reqLng = toFinite(input.lng);
  if (reqLat !== null && reqLng !== null) {
    return { area: { city, lat: reqLat, lng: reqLng, radiusM, source: "richiesta" }, warning: null };
  }

  // Coordinate gia salvate nelle impostazioni (usate solo se combaciano
  // con la citta richiesta, o se non c'e' una citta esplicita).
  const setLat = toFinite(input.settings.search_lat);
  const setLng = toFinite(input.settings.search_lng);
  const settingsHaveCoords = setLat !== null && setLng !== null;
  const cityMatchesSettings = city !== "" && city.toLowerCase() === settingsCity.toLowerCase();

  // 2) Geocoding della citta.
  if (city && (!cityMatchesSettings || !settingsHaveCoords)) {
    const point = await geocode(city, input.contactEmail ?? null);
    if (point) {
      return { area: { city, lat: point.lat, lng: point.lng, radiusM, source: "geocoding" }, warning: null };
    }
    // Geocoding non riuscito. Se la citta' richiesta NON e' quella salvata,
    // le coordinate salvate riguardano un altro posto: non dobbiamo mai
    // etichettarle con la citta' richiesta. Meglio un errore chiaro.
    if (!settingsHaveCoords || !cityMatchesSettings) {
      return {
        area: null,
        warning:
          "Coordinate non trovate per \"" + city + "\". Prova con \"Citta, Provincia\" oppure imposta lat e lng nelle impostazioni.",
      };
    }
    // La citta' e' quella salvata e le coordinate esistono: possiamo usarle.
  }

  // 3) Coordinate salvate nelle impostazioni.
  if (settingsHaveCoords) {
    return {
      area: { city: city || settingsCity, lat: setLat as number, lng: setLng as number, radiusM, source: "impostazioni" },
      warning: null,
    };
  }

  // 4) Nessuna area configurata: non inventiamo un posto.
  return {
    area: null,
    warning:
      "Area di ricerca non configurata: imposta la citta di ricerca (onboarding o impostazioni) e riprova.",
  };
}
