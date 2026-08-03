"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Reply,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

type Lead = { id: string; name: string; status: string } | null;

type Log = {
  id: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  status: string;
  hasReply: boolean;
  source: string | null;
  sentAt: string;
  repliedAt: string | null;
  lead: Lead;
};

type Summary = {
  totali: number;
  inviate: number;
  risposte: number;
  accettate: number;
  rifiutate: number;
  rimbalzate: number;
};

const FILTERS = [
  { key: "TUTTI", label: "Tutte" },
  { key: "IN_ATTESA", label: "In attesa" },
  { key: "RISPOSTE", label: "Risposte" },
  { key: "ACCETTATO", label: "Accettate" },
  { key: "RIFIUTATO", label: "Rifiutate" },
  { key: "RIMBALZATO", label: "Rimbalzate" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  INVIATO: { label: "Inviata", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  RISPOSTO: { label: "Ha risposto", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  ACCETTATO: { label: "Accettata", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  RIFIUTATO: { label: "Rifiutata", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  RIMBALZATO: { label: "Rimbalzata", cls: "bg-zinc-500/15 text-zinc-500" },
};

function fmt(d: string): string {
  try {
    return new Date(d).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function EmailPage() {
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [filter, setFilter] = React.useState("TUTTI");
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (q.trim()) params.set("q", q.trim());
    try {
      const r = await fetch("/api/email/logs?" + params.toString());
      const d = await r.json();
      setLogs(d.logs ?? []);
      setSummary(d.summary ?? null);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [filter, q]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function update(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    await fetch("/api/email/logs/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusyId(null);
    load();
  }

  function stat(label: string, value: number, cls: string) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className={"text-2xl font-bold " + cls}>{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email inviate</h1>
        <p className="text-muted-foreground">
          Vedi a chi hai scritto, lo stato di ogni email e chi ha risposto. Aggiorna lo stato con un clic.
        </p>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stat("Totali", summary.totali, "text-foreground")}
          {stat("In attesa", summary.inviate, "text-blue-600")}
          {stat("Risposte", summary.risposte, "text-amber-600")}
          {stat("Accettate", summary.accettate, "text-emerald-600")}
          {stat("Rifiutate", summary.rifiutate, "text-rose-600")}
          {stat("Rimbalzate", summary.rimbalzate, "text-zinc-500")}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca destinatario o oggetto..."
            className="w-64 pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nessuna email in questa vista. Invia email dal CRM o dalla pagina Messaggi: compariranno qui con il loro stato.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.INVIATO;
            const busy = busyId === log.id;
            return (
              <Card key={log.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{log.toName || log.toEmail}</span>
                      <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + badge.cls}>
                        {badge.label}
                      </span>
                      {log.hasReply && log.status === "INVIATO" ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                          Risposta ricevuta
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{log.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.toEmail} - {fmt(log.sentAt)}
                      {log.repliedAt ? " - risposta il " + fmt(log.repliedAt) : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => update(log.id, { status: "RISPOSTO" })}>
                          <Reply className="mr-1 h-3.5 w-3.5" /> Ha risposto
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600"
                          onClick={() => update(log.id, { status: "ACCETTATO" })}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Accettata
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600"
                          onClick={() => update(log.id, { status: "RIFIUTATO" })}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Rifiutata
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => update(log.id, { status: "RIMBALZATO" })}>
                          <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Rimbalzata
                        </Button>
                        {log.status !== "INVIATO" || log.hasReply ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => update(log.id, { status: "INVIATO", hasReply: false })}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Nota: il rilevamento automatico delle risposte richiede l'accesso alla casella (IMAP) e non e attivo in questa versione gratuita offline.
        Quando ricevi una risposta in Gmail, segnalala qui con un clic: lo stato del lead si aggiorna da solo (Ha risposto = In trattativa, Accettata = Cliente).
      </p>
    </div>
  );
}
