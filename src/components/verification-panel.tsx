"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import {
  VERIFICATION_FIELD_LABELS,
  VERIFICATION_STATUS_LABELS,
  type StoredVerification,
  type VerificationSummary,
} from "@/lib/verify";

const OVERALL_COLORS: Record<string, string> = {
  verificato: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  da_verificare: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  attenzione: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  verificato: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  da_verificare: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  assente: "bg-zinc-500/15 text-zinc-500",
  non_raggiungibile: "bg-red-500/15 text-red-600 dark:text-red-400",
  non_valido: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function formatCheckedAt(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

// Mostra, campo per campo, se un dato e verificato, sospetto o assente:
// con la fonte e la data del controllo. Nessun valore viene dato per
// buono senza una verifica registrata.
export function VerificationPanel({ leadId }: { leadId: string }) {
  const [results, setResults] = React.useState<StoredVerification[]>([]);
  const [summary, setSummary] = React.useState<VerificationSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/leads/" + leadId + "/verification");
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (data?.ok) {
          setResults(Array.isArray(data.results) ? data.results : []);
          setSummary(data.summary ?? null);
        } else {
          setError(data?.error ?? "Impossibile leggere i dati di verifica.");
        }
      } catch {
        if (alive) setError("Errore di rete durante la lettura della verifica.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [leadId]);

  async function runVerification() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/" + leadId + "/verify", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setResults(Array.isArray(data.results) ? data.results : []);
        setSummary(data.summary ?? null);
      } else {
        setError(data?.error ?? "Verifica non riuscita. Riprova tra poco.");
      }
    } catch {
      setError("Errore di rete durante la verifica.");
    } finally {
      setRunning(false);
    }
  }

  const overall = summary?.overall ?? "da_verificare";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Dati verificati
          {summary ? (
            <Badge className={OVERALL_COLORS[overall] ?? OVERALL_COLORS.da_verificare}>
              {summary.label}
            </Badge>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={runVerification}
            disabled={running}
          >
            {running ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Verifica ora
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ogni dato dice da dove viene e quando e stato controllato: nessun valore e dato per buono
          senza una verifica.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carico la verifica salvata...
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {!loading && !error && results.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nessuna verifica ancora salvata. Premi &quot;Verifica ora&quot; per controllare telefono,
            email, sito, indirizzo e social di questa attivita.
          </p>
        ) : null}

        {results.map((r) => (
          <div key={r.field} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {VERIFICATION_FIELD_LABELS[r.field] ?? r.field}
              </span>
              <Badge className={STATUS_COLORS[r.status] ?? STATUS_COLORS.da_verificare}>
                {VERIFICATION_STATUS_LABELS[r.status] ?? r.status}
              </Badge>
              {r.source ? (
                <span className="text-xs text-muted-foreground">
                  fonte: {r.source}
                  {r.checkedAt ? " · " + formatCheckedAt(r.checkedAt) : ""}
                </span>
              ) : null}
            </div>
            {r.evidence ? (
              <p className="mt-1 text-xs text-muted-foreground">{r.evidence}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
