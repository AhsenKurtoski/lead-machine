import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { geocodeCity } from "@/lib/geocode";
import { resolveSearchArea } from "@/lib/search-area";
import { findProvinceComuni, provinceFromDisplayName } from "@/lib/province-area";
import { asNumber, rateLimitedResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// GET /api/provincia?city=Sedico   (oppure ?lat=..&lng=..)
// Restituisce i comuni attorno alla citta scelta, chiesti a OpenStreetMap:
// cosi la ricerca "a tutta la zona" non dipende da un elenco cablato e
// funziona per qualsiasi citta. Se Overpass non risponde, risponde 200 con
// `comuni: []` e un avviso: la pagina ripiega sulla sola citta, senza
// inventare comuni.
// Le coordinate esplicite (o quelle gia salvate in Impostazioni) evitano il
// passaggio dal geocoding: con Nominatim lento o irraggiungibile la pagina
// continua a funzionare con l'area che l'utente ha gia configurato.
export async function GET(req: Request) {
  const rl = await rateLimitedResponse(req, "provincia", 20, 60_000);
  if (rl) return rl;

  const params = new URL(req.url).searchParams;
  const city = (params.get("city") ?? "").trim();
  const lat = asNumber(params.get("lat"), -90, 90);
  const lng = asNumber(params.get("lng"), -180, 180);
  const settings = await getSettings();
  const resolved = await resolveSearchArea({ city, lat, lng, settings });

  if (!resolved.area) {
    return NextResponse.json(
      { ok: false, error: resolved.warning },
      { status: 400 }
    );
  }

  const area = resolved.area;
  // Contatto OSM (facoltativo): identifica le richieste verso Overpass e
  // Nominatim. Non e' una chiave e senza di esso tutto continua a funzionare.
  const osmContact = settings.osm_contact_email || process.env.OSM_CONTACT_EMAIL || "";
  // Il nome dell'area (es. "Belluno") serve solo per l'etichetta in pagina:
  // si legge da quello che risponde il servizio, invece di essere scritto nel
  // codice. Se il geocoding non risponde l'etichetta resta vuota.
  const point =
    area.source === "richiesta" && !city ? null : await geocodeCity(area.city || city, osmContact);
  const found = await findProvinceComuni(area.lat, area.lng, undefined, osmContact);

  return NextResponse.json({
    ok: true,
    area,
    areaLabel:
      found.areaLabel ??
      point?.areaLabel ??
      provinceFromDisplayName(point?.displayName ?? ""),
    count: found.comuni.length,
    comuni: found.comuni,
    warning: found.warning,
  });
}
