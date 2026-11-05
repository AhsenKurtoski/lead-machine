"use client";

import * as React from "react";
import { CATEGORIES, CATEGORY_GROUPS } from "@/lib/categories";
import { MAX_AREA_CENTERS, RADIUS_PRESETS, type ProvinceComune } from "@/lib/province-area";
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
  const [sources, setSources] = React.useState<{
    osm: number | null;
    geoapify: number | null;
    tomtom: number | null;
    ai: number | null;
  } | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [area, setArea] = React.useState<"citta" | "provincia" | "comune">("citta");
  const [comune, setComune] = React.useState<string>("");
  const [radius, setRadius] = React.useState<number>(10000);
  const [city, setCity] = React.useState<string>("");

  // Comuni dell'area intorno alla citta scelta: arrivano da OpenStreetMap
  // (/api/provincia) a runtime, non da un elenco scritto nel codice. Se non
  // arrivano restano vuoti: meglio nessuna ricerca "a zona" che una inventata.
  const [comuni, setComuni] = React.useState<ProvinceComune[]>([]);
  const [areaLabel, setAreaLabel] = React.useState<string | null>(null);
  const [areaLoading, setAreaLoading] = React.useState<boolean>(false);
  const [areaWarning, setAreaWarning] = React.useState<string | null>(null);

  // Li chiede al server, che interroga OpenStreetMap: nessun elenco cablato e
  // nessun comune inventato, se la risposta non arriva la lista resta vuota.
  const loadArea = React.useCallback(async (name: string, coords?: { lat: number; lng: number }) => {
    if (!name && !coords) return;
    setAreaLoading(true);
    setAreaWarning(null);
    try {
      // Le coordinate salvate in Impostazioni vengono passate al server: con
      // quelle il geocoding non serve e la pagina funziona anche se Nominatim
      // non risponde.
      const qs = new URLSearchParams();
      if (name) qs.set("city", name);
      if (coords) {
        qs.set("lat", String(coords.lat));
        qs.set("lng", String(coords.lng));
      }
      const res = await fetch("/api/provincia?" + qs.toString());
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Comuni non disponibili");
      const list: ProvinceComune[] = Array.isArray(data.comuni) ? data.comuni : [];
      setComuni(list);
      setAreaLabel(typeof data.areaLabel === "string" ? data.areaLabel : null);
      if (typeof data.warning === "string" && data.warning) setAreaWarning(data.warning);
      if (list.length > 0) {
        // Preseleziona la citta dell'utente se c'e', altrimenti il primo comune.
        setComune((prev) => {
          if (prev && list.some((c) => c.name === prev)) return prev;
          const exact = name
            ? list.find((c) => c.name.toLowerCase() === name.toLowerCase())
            : undefined;
          return (exact ?? list[0]).name;
        });
      } else {
        setComune("");
      }
    } catch (e) {
      setComuni([]);
      setComune("");
      setAreaWarning(
        (e instanceof Error ? e.message : "Comuni non disponibili") +
          " - la ricerca a zona non e disponibile, usa la tua citta o un comune."
      );
    } finally {
      setAreaLoading(false);
    }
  }, []);

  // Citta scelta dall'utente (onboarding o impostazioni): serve per le
  // etichette e per caricare i comuni dell'area.
  React.useEffect(() => {
    let alive = true;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const c = d?.settings?.search_city;
        const name = typeof c === "string" ? c.trim() : "";
        const lat = Number(d?.settings?.search_lat);
        const lng = Number(d?.settings?.search_lng);
        const coords =
          Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
        if (!name && !coords) return;
        if (name) setCity(name);
        void loadArea(name, coords);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loadArea]);

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
        if (comuni.length === 0) {
          throw new Error("Comuni non disponibili: riprova tra poco oppure cerca sulla tua citta.");
        }
        // Un centro = una interrogazione a OpenStreetMap: usiamo i comuni piu
        // vicini invece di tutta la lista, cosi la ricerca resta veloce e
        // copre il territorio intorno alla citta senza esaurire il tempo.
        centers = comuni
          .slice(0, MAX_AREA_CENTERS)
          .map((c) => ({ lat: c.lat, lng: c.lng, city: c.name }));
        searchRadius = radius;
      } else if (area === "comune") {
        const c = comuni.find((x) => x.name === comune);
        if (!c) {
          throw new Error("Scegli un comune dall'elenco.");
        }
        centers = [{ lat: c.lat, lng: c.lng, city: c.name }];
        searchRadius = radius;
      }
      const res = await fetch("/api/ricerca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: Array.from(selected),
          useAi,
          centers,
          radius: searchRadius,
          // Etichetta dell'area per il prompt AI: nessuna provincia cablata.
          areaLabel:
            area === "provincia" && areaLabel
              ? "provincia di " + areaLabel
              : centers[0]?.city ?? city,
        }),
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

  // Etichetta della zona "allargata": nessun nome di provincia scritto nel
  // codice, si adatta a quello che OpenStreetMap ha restituito.
  const centriArea = Math.min(comuni.length, MAX_AREA_CENTERS);
  const provinciaLabel = areaLoading
    ? "Carico i comuni..."
    : comuni.length > 0
      ? "Tutta la zona" +
        (areaLabel ? " (provincia di " + areaLabel + ")" : "") +
        (comuni.length > MAX_AREA_CENTERS
          ? " - i " + MAX_AREA_CENTERS + " comuni piu vicini"
          : " - " + comuni.length + " comuni")
      : "Tutta la zona (non disponibile)";
  const areaOptions = [
    { id: "citta" as const, label: city ? city + " (5 km)" : "La mia citta (5 km)", disabled: false },
    { id: "provincia" as const, label: provinciaLabel, disabled: areaLoading || comuni.length === 0 },
    { id: "comune" as const, label: "Comune specifico", disabled: areaLoading || comuni.length === 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ricerca lead</h1>
        <p className="text-muted-foreground">
          Attivita locali {city ? "a " + city : "nella tua zona"}
          {areaLabel
            ? ", in un comune o in tutta la provincia di " + areaLabel
            : ", in un comune o in tutta la zona"}{" "}
          - fonti gratuite: OpenStreetMap, Geoapify e AI (Gemini).
        </p>
      </div>

      {/* Zona di ricerca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zona di ricerca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {areaOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setArea(opt.id)}
                disabled={opt.disabled}
                title={opt.disabled && areaWarning ? areaWarning : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  area === opt.id ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-accent",
                  opt.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {areaWarning ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">{areaWarning}</p>
          ) : null}
          {area === "comune" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Comune:</span>
              <select
                value={comune}
                onChange={(e) => setComune(e.target.value)}
                disabled={areaLoading || comuni.length === 0}
                className={SELECT_CLASS}
              >
                {comuni.length === 0 ? (
                  <option value="">{areaLoading ? "Carico i comuni..." : "Nessun comune disponibile"}</option>
                ) : null}
                {comuni.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {area !== "citta" ? (
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
              La ricerca verra eseguita su {centriArea} comuni
              {comuni.length > MAX_AREA_CENTERS
                ? " (i " +
                  MAX_AREA_CENTERS +
                  " piu vicini a " +
                  (city || "te") +
                  ", su " +
                  comuni.length +
                  " disponibili nell&apos;area)"
                : " dell&apos;area"}
              : puo richiedere piu tempo.
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
          <Badge variant="secondary">TomTom: {sources.tomtom ?? "-"}</Badge>
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
