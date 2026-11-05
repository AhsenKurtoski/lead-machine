// ============================================================
// Area di ricerca oltre la singola citta (la "provincia").
//
// Nessun elenco di comuni scritto nel codice: i centri abitati
// vengono chiesti a OpenStreetMap (Overpass) a partire dalle
// coordinate della citta scelta dall'utente, quindi la modalita
// funziona ovunque, non solo dove e' stata provata per prima.
//
// Qui sta la logica pura (query QL, parsing della risposta e
// nome dell'area) cosi i test girano senza rete; la chiamata di
// rete e in findProvinceComuni, con l'esecutore iniettabile.
// ============================================================

import { runOverpassQuery } from "./overpass";
import { osmContactEmail } from "./osm";

export type ProvinceComune = { name: string; lat: number; lng: number };

export type ProvinceArea = {
  comuni: ProvinceComune[];
  areaLabel: string | null;
  warning: string | null;
};

// Raggi disponibili (in metri) per la ricerca. Stanno qui perche' valgono
// sia per la singola citta sia per l'area allargata.
export const RADIUS_PRESETS: { value: number; label: string }[] = [
  { value: 5000, label: "5 km (citta)" },
  { value: 10000, label: "10 km" },
  { value: 20000, label: "20 km (comprensorio)" },
  { value: 35000, label: "35 km (zona ampia)" },
];

/** Numero massimo di comuni restituiti (elenco scegliibile dal menu). */
export const MAX_PROVINCE_COMUNI = 80;

/**
 * Quanti comuni usare come centri per una ricerca "a tutta la zona".
 * Ogni centro e' una interrogazione a OpenStreetMap e il budget complessivo
 * della ricerca e' di ~100 secondi: con piu centri il tempo finisce a meta
 * provincia e i risultati restano parziali. `parseProvinceComuni` ordina dal
 * piu vicino al centro, quindi i primi N sono i comuni intorno alla citta.
 */
export const MAX_AREA_CENTERS = 20;

/**
 * Raggio del ripiego quando i confini amministrativi non sono disponibili.
 * Copre il comprensorio intorno alla citta' senza dipendere dagli indici
 * delle aree amministrative, che alcuni mirror pubblici non hanno.
 */
export const AREA_FALLBACK_RADIUS_M = 40_000;

function coord(n: number): string {
  // Meglio un errore chiaro che una query su coordinate inventate (0,0).
  if (!Number.isFinite(n)) throw new Error("Coordinate non valide: " + n);
  return n.toFixed(5);
}

/**
 * Query Overpass per i centri abitati dentro l'area amministrativa
 * (provincia / citta metropolitana) che contiene il punto dato.
 * `is_in` trova le aree che contengono il punto: nessun nome di
 * provincia, nessun elenco di comuni da aggiornare a mano.
 */
export function buildProvinceComuniQuery(
  lat: number,
  lng: number,
  limit: number = MAX_PROVINCE_COMUNI
): string {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit) || MAX_PROVINCE_COMUNI));
  return [
    "[out:json][timeout:60];",
    "is_in(" + coord(lat) + "," + coord(lng) + ")->.a;",
    'area.a["boundary"="administrative"]["admin_level"="6"]->.prov;',
    'node(area.prov)["place"~"^(city|town|village)$"]["name"];',
    "out center " + safeLimit + ";",
  ].join("\n");
}

/**
 * Query di ripiego: i centri abitati entro un raggio dalla citta', senza
 * `is_in` ne' aree amministrative. E' la forma piu' leggera e passa anche sui
 * mirror che hanno l'indice delle aree guasto (es. overpass.openstreetmap.fr).
 */
export function buildRadiusComuniQuery(
  lat: number,
  lng: number,
  radiusM: number = AREA_FALLBACK_RADIUS_M,
  limit: number = MAX_PROVINCE_COMUNI
): string {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit) || MAX_PROVINCE_COMUNI));
  const safeRadius = Math.max(1_000, Math.min(200_000, Math.trunc(radiusM) || AREA_FALLBACK_RADIUS_M));
  return [
    "[out:json][timeout:60];",
    'node(around:' +
      safeRadius +
      "," +
      coord(lat) +
      "," +
      coord(lng) +
      ')["place"~"^(city|town|village)$"]["name"];',
    "out center " + safeLimit + ";",
  ].join("\n");
}

/** Chiave di confronto per nome di comune: senza maiuscole, accenti o spazi doppi. */
export function comuneKey(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Distanza in km (formula dell'emiseno, sufficiente per ordinare i comuni).
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Trasforma la risposta di Overpass in un elenco di comuni.
 * Pura: nessuna rete, verificabile dai test. Scarta le voci senza nome o
 * senza coordinate, unisce i doppioni e ordina dal piu vicino al centro.
 */
export function parseProvinceComuni(
  elements: unknown,
  center?: { lat: number; lng: number },
  limit: number = MAX_PROVINCE_COMUNI
): ProvinceComune[] {
  if (!Array.isArray(elements)) return [];
  const seen = new Set<string>();
  const out: ProvinceComune[] = [];

  for (const raw of elements) {
    const el = (raw ?? {}) as Record<string, unknown>;
    const tags = (el.tags ?? {}) as Record<string, unknown>;
    const name = typeof tags.name === "string" ? tags.name.trim() : "";
    if (!name) continue;

    const c = (el.center ?? {}) as Record<string, unknown>;
    const lat = Number(el.lat ?? c.lat);
    const lng = Number(el.lon ?? c.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const key = comuneKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, lat, lng });
  }

  if (center) {
    out.sort((a, b) => distanceKm(center, a) - distanceKm(center, b));
  } else {
    out.sort((a, b) => a.name.localeCompare(b.name, "it"));
  }

  return out.slice(0, Math.max(1, Math.trunc(limit) || MAX_PROVINCE_COMUNI));
}

/**
 * Nome leggibile dell'area a partire dal nome esteso del geocoding, es.
 * "Feltre, Provincia di Belluno, Veneto, Italia" -> "Belluno".
 * Nessun nome di provincia e scritto nel codice: si legge la risposta.
 */
export function provinceFromDisplayName(displayName: string): string | null {
  const parts = (displayName || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const prov = /^provincia\s+di\s+(.+)$/i.exec(part);
    if (prov) return prov[1].trim();
    const metro = /^citt[aà]\s+metropolitana\s+di\s+(.+)$/i.exec(part);
    if (metro) return metro[1].trim();
    const free = /^libero\s+consorzio\s+comunale\s+di\s+(.+)$/i.exec(part);
    if (free) return free[1].trim();
  }
  return null;
}

/**
 * Chiede a OpenStreetMap i comuni dell'area che contiene il punto.
 *
 * Le due strade partono INSIEME invece che una dopo l'altra:
 *   1. i confini amministrativi (la provincia esatta);
 *   2. i comuni entro un raggio, che non dipendono dagli indici delle aree.
 * I mirror pubblici alternano risposte regolari e 504, quindi raddoppiare le
 * possibilita' dentro lo stesso tempo di attesa e' molto piu' efficace che
 * sommare due tentativi in sequenza (che e' anche il motivo per cui la pagina
 * restava senza comuni quando il primo tentativo si mangiava tutto il budget).
 *
 * Se nessuno dei due risponde non inventa nulla: torna una lista vuota con un
 * avviso leggibile, cosi il chiamante ripiega sulla sola citta scelta.
 */
export async function findProvinceComuni(
  lat: number,
  lng: number,
  run: (query: string, contactEmail: string, budgetMs?: number) => Promise<unknown> = runOverpassQuery,
  // Il contatto (facoltativo) arriva dall'ambiente solo se e' un indirizzo
  // reale: mai un'email segnaposto, che i servizi OSM rifiutano.
  contactEmail: string = osmContactEmail() ?? "",
  budgetMs = 60_000
): Promise<ProvinceArea> {
  // Le due richieste vanno UNA ALLA VOLTA, non insieme: un mirror pubblico che
  // riceve due query contemporanee dallo stesso indirizzo risponde a una delle
  // due con un risultato vuoto (verificato: la stessa query da sola restituisce
  // 80 comuni, in coppia risponde zero). Un risultato vuoto e' indistinguibile
  // da "non ci sono comuni", quindi la parallela non si puo' permettere.
  //
  // Prima i confini amministrativi (piu' precisi, ma piu' fragili: l'indice
  // delle aree manca per esempio al mirror francese) con un budget corto, poi i
  // comuni intorno alla citta' con quello che resta, che e' la strada che regge.
  const startedAt = Date.now();
  const boundaryBudget = Math.max(6_000, Math.round(budgetMs * 0.18));

  let boundaryComuni: ProvinceComune[] = [];
  let boundaryError: unknown = null;
  try {
    boundaryComuni = parseProvinceComuni(
      await run(buildProvinceComuniQuery(lat, lng), contactEmail, boundaryBudget),
      { lat, lng }
    );
  } catch (err) {
    boundaryError = err;
  }
  // 1) Confini arrivati: e' la lista esatta dei comuni della provincia /
  // citta' metropolitana, la risposta preferita.
  if (boundaryComuni.length > 0) return { comuni: boundaryComuni, areaLabel: null, warning: null };

  // 2) Comuni veri di OpenStreetMap entro il raggio, ordinati dal piu' vicino:
  // cambia l'ampiezza dell'area, non la qualita' del dato.
  const radiusBudget = Math.max(15_000, Math.round(budgetMs * 0.7) - (Date.now() - startedAt));
  let radiusComuni: ProvinceComune[] = [];
  let radiusError: unknown = null;
  try {
    radiusComuni = parseProvinceComuni(
      await run(buildRadiusComuniQuery(lat, lng), contactEmail, radiusBudget),
      { lat, lng }
    );
  } catch (err) {
    radiusError = err;
  }

  if (radiusComuni.length > 0) {
    return {
      comuni: radiusComuni,
      areaLabel: null,
      warning:
        "Confini della provincia non disponibili in questo momento: uso i comuni entro " +
        Math.round(AREA_FALLBACK_RADIUS_M / 1000) +
        " km dalla citta' scelta.",
    };
  }

  // Nessuno dei due ha risposto: meglio l'avviso con il motivo reale che una
  // lista vuota senza spiegazione.
  const details = [
    reasonOf("confini", boundaryComuni, boundaryError),
    reasonOf("comuni intorno", radiusComuni, radiusError),
  ].join(" ");
  return {
    comuni: [],
    areaLabel: null,
    warning:
      "Il servizio gratuito OpenStreetMap (Overpass) e momentaneamente sovraccarico o irraggiungibile: " +
      "la ricerca usera solo la citta scelta. Dettaglio tecnico: " +
      details,
  };
}

/** Perche' una delle due strade non ha dato comuni (serve solo all'avviso in pagina). */
function reasonOf(label: string, comuni: ProvinceComune[], error: unknown): string {
  if (error) return label + ": " + (error instanceof Error ? error.message : String(error));
  return label + ": " + (comuni.length === 0 ? "nessun risultato" : comuni.length + " comuni");
}
