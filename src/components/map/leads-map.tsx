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

const CENTER: [number, number] = [
  Number(process.env.NEXT_PUBLIC_SEARCH_LAT ?? "46.0172"),
  Number(process.env.NEXT_PUBLIC_SEARCH_LNG ?? "11.91"),
];

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
  return (
    <MapContainer
      center={CENTER}
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
