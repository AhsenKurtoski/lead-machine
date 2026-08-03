"use client";

import * as React from "react";
import { CATEGORIES, CATEGORY_GROUPS } from "@/lib/categories";
import { BELLUNO_COMUNI, FELTRE_CENTER, RADIUS_PRESETS } from "@/lib/comuni-belluno";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, priorityColor } from "@/lib/utils";
import {
  Search,
  Loader2,
  Globe,
  Instagram,
  Phone,
  Mail,
  CheckCircle2,
  HelpCircle,
  Save,
} from "lucide-react";

type Candidate = {
  osmId: string;
  name: string;
  category: string;
  categoryLabel: string;
  lat: number;
  lng: number;
  addressFull?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  hasWebsite: boolean;
  hasSocial: boolean;
  priorityScore: number;
  priorityReason: string;
  websiteStatus: string;
};

const SELECT_CLASS = "rounded-md border border-input bg-background px-2 py-1 text-sm";

export default function RicercaPage() {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<Candidate[]>([]);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [onlyNoWeb, setOnlyNoWeb] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [useAi, setUseAi] = React.useState(true);
  const [sources, setSources] = React.useState<{ osm: number | null; geoapify: number | null; ai: number | null } | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [area, setArea] = React.useState<"feltre" | "provincia" | "comune">("feltre");
  const [comune, setComune] = React.useState<string>(FELTRE_CENTER.name);
  const [radius, setRadius] = React.useState<number>(10000);

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRow(osmId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(osmId)) next.delete(osmId);
      else next.add(osmId);
      return next;
    });
  }

  async function search() {
    setLoading(true);
    setError(null);
    setSaveMsg(null);
    setResults([]);
    setChecked(new Set());
    setSearched(false);
    setSources(null);
    setWarnings([]);
    try {
      let centers: { lat: number; lng: number; city: string }[] = [];
      let searchRadius = 5000;
      if (area === "provincia") {
        centers = BELLUNO_COMUNI.map((c) => ({ lat: c.lat, lng: c.lng, city: c.name }));
        searchRadius = radius;
      } else if (area === "comune") {
        const c = BELLUNO_COMUNI.find((x) => x.name === comune) ?? FELTRE_CENTER;
        centers = [{ lat: c.lat, lng: c.lng, city: c.name }];
        searchRadius = radius;
      }
      const res = await fetch("/api/ricerca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: Array.from(selected), useAi, centers, radius: searchRadius }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Errore nella ricerca");
      setResults(data.candidates);
      setSources(data.sources ?? null);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  async function save(all: boolean) {
    const toSave = all
      ? visible
      : visible.filter((c) => checked.has(c.osmId));
    if (toSave.length === 0) return;
    setSaveMsg(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: toSave }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSaveMsg(`Salvati ${data.saved} lead nel CRM (${data.skipped} gia presenti).`);
      setChecked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    }
  }

  const visible = onlyNoWeb ? results.filter((r) => !r.hasWebsite) : results;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ricerca lead</h1>
        <p className="text-muted-foreground">
          Attivita locali a Feltre, in un comune o in tutta la provincia di Belluno - fonti gratuite: OpenStreetMap, Geoapify e AI (Gemini).
        </p>
      </div>

      {/* Zona di ricerca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zona di ricerca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {([
              { id: "feltre", label: "Feltre (5 km)" },
              { id: "provincia", label: "Tutta la provincia di Belluno" },
              { id: "comune", label: "Comune specifico" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setArea(opt.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  area === opt.id ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-accent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {area === "comune" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Comune:</span>
              <select value={comune} onChange={(e) => setComune(e.target.value)} className={SELECT_CLASS}>
                {BELLUNO_COMUNI.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {area !== "feltre" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Raggio per comune:</span>
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className={SELECT_CLASS}>
                {RADIUS_PRESETS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          {area === "provincia" ? (
            <p className="text-xs text-muted-foreground">
              La ricerca verra eseguita su {BELLUNO_COMUNI.length} comuni della provincia: puo richiedere piu tempo.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Filtri categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Categorie ({selected.size === 0 ? "tutte" : selected.size} selezionate)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORY_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter((c) => c.group === group).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected.has(c.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={search} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Ricerca in corso..." : "Cerca attivita"}
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyNoWeb}
                onChange={(e) => setOnlyNoWeb(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Mostra solo chi non ha un sito rilevato
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Includi ricerca AI (Gemini)
            </label>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {saveMsg && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          {saveMsg}
        </div>
      )}
      {searched && sources && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Fonti:</span>
          <Badge variant="secondary">OpenStreetMap: {sources.osm ?? "-"}</Badge>
          <Badge variant="secondary">Geoapify: {sources.geoapify ?? "-"}</Badge>
          <Badge variant="secondary">AI Gemini: {sources.ai ?? "-"}</Badge>
        </div>
      )}
      {searched && warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {/* Risultati */}
      {visible.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {visible.length} attivita trovate
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => save(false)} disabled={checked.size === 0}>
                <Save className="h-4 w-4" /> Salva selezionati ({checked.size})
              </Button>
              <Button size="sm" onClick={() => save(true)}>
                <Save className="h-4 w-4" /> Salva tutti
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="w-10 p-3"></th>
                    <th className="p-3">Attivita</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Sito</th>
                    <th className="p-3">Social</th>
                    <th className="p-3">Contatti</th>
                    <th className="p-3 text-right">Priorita</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.osmId} className="border-b last:border-0 hover:bg-accent/50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={checked.has(c.osmId)}
                          onChange={() => toggleRow(c.osmId)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </td>
                      <td className="p-3">
                        <p className="flex items-center gap-2 font-medium">
                          {c.name}
                          {c.osmId.startsWith("ai/") && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">AI</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.addressFull ?? "-"}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{c.categoryLabel}</Badge>
                      </td>
                      <td className="p-3">
                        {c.hasWebsite ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Sì
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-amber-500"
                            title="Nessun sito rilevato su OpenStreetMap: da verificare"
                          >
                            <HelpCircle className="h-4 w-4" /> Da verificare
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {c.hasSocial ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <Instagram className="h-4 w-4" /> Sì
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-amber-500"
                            title="Nessun social rilevato su OpenStreetMap: da verificare"
                          >
                            <HelpCircle className="h-4 w-4" /> Da verificare
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 text-muted-foreground">
                          {c.phone && <Phone className="h-4 w-4" />}
                          {c.email && <Mail className="h-4 w-4" />}
                          {c.website && <Globe className="h-4 w-4" />}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={cn("font-bold tabular-nums", priorityColor(c.priorityScore))}
                          title={c.priorityReason}
                        >
                          {c.priorityScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && results.length === 0 && !error && searched && (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          Nessuna attivita trovata per queste categorie entro il raggio impostato.
          Prova a selezionare piu categorie (o tutte), oppure riprova tra poco:
          il servizio gratuito OpenStreetMap a volte e momentaneamente occupato.
        </div>
      )}
      {!loading && results.length === 0 && !error && !searched && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Seleziona le categorie (o lasciale tutte) e premi "Cerca attivita".
        </p>
      )}
    </div>
  );
}
