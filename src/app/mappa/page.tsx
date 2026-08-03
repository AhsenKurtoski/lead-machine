"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { CATEGORIES } from "@/lib/categories";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABELS, statusLabel } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import type { MapLead } from "@/components/map/leads-map";

const STATUSES = Object.keys(STATUS_LABELS);

// La mappa Leaflet va caricata solo lato client (no SSR).
const LeadsMap = dynamic(() => import("@/components/map/leads-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full items-center justify-center rounded-xl border bg-card text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
});

type Lead = MapLead & { lat: number | null; lng: number | null };

const LEGEND = [
  { label: "80-100 (altissima)", color: "#dc2626" },
  { label: "60-79 (alta)", color: "#ea580c" },
  { label: "40-59 (media)", color: "#d97706" },
  { label: "0-39 (bassa)", color: "#71717a" },
];

export default function MappaPage() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [onlyNoWeb, setOnlyNoWeb] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (onlyNoWeb) params.set("onlyNoWeb", "1");
    const res = await fetch("/api/leads?" + params.toString());
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, [statusFilter, categoryFilter, onlyNoWeb]);

  React.useEffect(() => {
    load();
  }, [load]);

  const geoLeads = leads.filter(
    (l): l is Lead & { lat: number; lng: number } =>
      typeof l.lat === "number" && typeof l.lng === "number"
  );

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mappa lead</h1>
        <p className="text-muted-foreground">
          {geoLeads.length} lead geolocalizzati nella zona di Feltre.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tutti gli stati</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <select className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Tutte le categorie</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyNoWeb}
              onChange={(e) => setOnlyNoWeb(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Solo senza sito
          </label>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-3 w-3 rounded-full" style={legendDot(item.color)} />
                {item.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[600px] w-full items-center justify-center rounded-xl border bg-card text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : geoLeads.length === 0 ? (
        <div className="flex h-[400px] w-full flex-col items-center justify-center gap-3 rounded-xl border bg-card text-center text-muted-foreground">
          <MapPin className="h-10 w-10 opacity-40" />
          <p>Nessun lead geolocalizzato. Salva attivita dalla Ricerca per vederle qui.</p>
        </div>
      ) : (
        <LeadsMap leads={geoLeads} />
      )}
    </div>
  );
}

function legendDot(color: string): React.CSSProperties {
  return { backgroundColor: color };
}
