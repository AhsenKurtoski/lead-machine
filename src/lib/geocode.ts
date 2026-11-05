// ============================================================
// Geocoding citta -> coordinate (OpenStreetMap, gratis, nessuna chiave).
//
// Serve a rendere l'app agnostica dalla citta: l'utente scrive la propria
// citta in onboarding e la ricerca si centra la', senza coordinate scritte a
// mano nel codice.
//
// Due servizi in cascata, entrambi reali e senza chiave:
//   1. Nominatim (OpenStreetMap) — il nome esteso contiene la provincia;
//   2. Photon (komoot) — ripiego quando Nominatim e' lento o irraggiungibile.
// Lo User-Agent arriva da ./osm: con un'email segnaposto Nominatim risponde
// 403 "Access denied" e il geocoding smette di funzionare, quindi non ne
// mandiamo mai una.
//
// La logica di parsing e' pura, cosi i test girano senza rete.
// ============================================================

import { osmContactEmail, osmUrlWithContact, userAgentFor } from "./osm";

export type GeoPoint = {
  lat: number;
  lng: number;
  displayName: string;
  /**
   * Nome dell'area amministrativa (la provincia) quando il geocoder lo
   * conosce gia': Photon lo restituisce a parte, Nominatim lo si ricava dal
   * nome esteso. null = non noto, mai un valore inventato.
   */
  areaLabel?: string | null;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";
const TIMEOUT_MS = 8000;

/**
 * Estrae il primo risultato dalla risposta JSON di Nominatim.
 * Funzione pura: nessuna rete, testabile.
 */
export function parseGeocodeResults(data: unknown): GeoPoint | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0] as Record<string, unknown>;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const displayName = typeof first?.display_name === "string" ? first.display_name : "";
  // Con `addressdetails=1` Nominatim restituisce l'indirizzo strutturato: il
  // `county` e' la provincia (es. Feltre -> "Belluno"). Serve perche' il nome
  // esteso non contiene sempre "Provincia di".
  const address = (first?.address ?? {}) as Record<string, unknown>;
  const county = typeof address.county === "string" ? address.county.trim() : "";
  return { lat, lng, displayName, areaLabel: county || null };
}

/**
 * Estrae il primo risultato dalla risposta GeoJSON di Photon.
 * `coordinates` e' [longitudine, latitudine] (GeoJSON), quindi invertito
 * rispetto a Nominatim. Funzione pura: nessuna rete, testabile.
 */
export function parsePhotonResults(data: unknown): GeoPoint | null {
  const features = (data as { features?: unknown } | null)?.features;
  if (!Array.isArray(features) || features.length === 0) return null;

  const first = (features[0] ?? {}) as Record<string, unknown>;
  const geometry = (first.geometry ?? {}) as Record<string, unknown>;
  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const props = (first.properties ?? {}) as Record<string, unknown>;
  const pick = (k: string): string => (typeof props[k] === "string" ? (props[k] as string).trim() : "");
  // Nome leggibile nello stesso stile di Nominatim, senza ripetizioni.
  const displayName = [...new Set([pick("name"), pick("city"), pick("county"), pick("state"), pick("country")].filter(Boolean))].join(", ");
  const county = pick("county");

  return { lat, lng, displayName, areaLabel: county || null };
}

// --- Servizi di rete (uno per geocoder, isolati per poterli sostituire) ---

async function fetchJson(url: string, contact?: string | null): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgentFor(contact ?? osmContactEmail()),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Servizio lento o irraggiungibile: il chiamante passa al prossimo.
    return null;
  }
}

async function geocodeWithNominatim(q: string, contact?: string | null): Promise<GeoPoint | null> {
  // jsonv2 + addressdetails: coordinate, nome esteso e provincia in una sola
  // chiamata (la provincia non e' sempre scritta nel nome esteso).
  const url = osmUrlWithContact(
    NOMINATIM_URL + "?format=jsonv2&addressdetails=1&limit=1&q=" + encodeURIComponent(q)
  );
  return parseGeocodeResults(await fetchJson(url, contact));
}

async function geocodeWithPhoton(q: string, contact?: string | null): Promise<GeoPoint | null> {
  const url = PHOTON_URL + "?limit=1&q=" + encodeURIComponent(q);
  return parsePhotonResults(await fetchJson(url, contact));
}

/**
 * Cerca le coordinate di una citta (es. "Milano", "Belluno, Italia").
 * Ritorna null se la citta non esiste o nessuno dei due servizi risponde:
 * il chiamante decide come reagire, senza inventare coordinate.
 * `contact` e' l'email (facoltativa) da mandare a OpenStreetMap.
 */
export async function geocodeCity(city: string, contact?: string | null): Promise<GeoPoint | null> {
  const q = (city || "").trim();
  if (!q) return null;

  const nominatim = await geocodeWithNominatim(q, contact);
  if (nominatim) return nominatim;

  return geocodeWithPhoton(q, contact);
}
