"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapLead = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  lat: number;
  lng: number;
  priorityScore: number;
  status: string;
  hasWebsite: boolean;
  hasSocial: boolean;
};

// Override di deploy (facoltativo): nessuna citta scritta nel codice.
const ENV_CENTER: [number, number] | null = (() => {
  const lat = Number(process.env.NEXT_PUBLIC_SEARCH_LAT);
  const lng = Number(process.env.NEXT_PUBLIC_SEARCH_LNG);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
})();

// Centro della mappa: la media dei lead geolocalizzati. Se non ce ne sono,
// usiamo l'override di deploy e in ultima istanza il centro Italia.
function centerFor(leads: MapLead[]): [number, number] {
  if (leads.length === 0) return ENV_CENTER ?? [42.5, 12.5];
  const lat = leads.reduce((sum, l) => sum + l.lat, 0) / leads.length;
  const lng = leads.reduce((sum, l) => sum + l.lng, 0) / leads.length;
  return [lat, lng];
}

// URL dei tile OpenStreetMap. I segnaposto s/z/x/y sono richiesti da Leaflet.
const OSM_TILE_URL =
  "https://" + "{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export function colorForScore(score: number): string {
  if (score >= 80) return "#dc2626";
  if (score >= 60) return "#ea580c";
  if (score >= 40) return "#d97706";
  return "#71717a";
}

export default function LeadsMap({ leads }: { leads: MapLead[] }) {
  const center = centerFor(leads);
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-[600px] w-full rounded-xl z-0"
    >
      <TileLayer
        attribution='&copy; collaboratori OpenStreetMap'
        url={OSM_TILE_URL}
      />
      {leads.map((l) => {
        const color = colorForScore(l.priorityScore);
        const opts = { color, fillColor: color, fillOpacity: 0.75, weight: 2 };
        return (
          <CircleMarker key={l.id} center={[l.lat, l.lng]} radius={9} pathOptions={opts}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{l.name}</p>
                <p className="text-xs text-zinc-500">{l.subcategory ?? l.category ?? "-"}</p>
                <p className="text-xs">
                  Priorita: <b>{l.priorityScore}</b>
                </p>
                <p className="text-xs">
                  Sito: {l.hasWebsite ? "si" : "NO"} - Social: {l.hasSocial ? "si" : "NO"}
                </p>
                <a
                  href={"/crm/" + l.id}
                  className="text-xs font-medium text-blue-600 underline"
                >
                  Apri scheda lead
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
