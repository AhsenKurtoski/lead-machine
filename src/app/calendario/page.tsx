"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FOLLOWUP_CHANNEL_LABELS,
  formatDateTime,
  dueBucket,
  BUCKET_LABELS,
  type DueBucket,
} from "@/lib/followups";
import {
  Bell,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Download,
  Sparkles,
} from "lucide-react";

type LeadLite = { id: string; name: string };
type FollowUp = {
  id: string;
  leadId: string;
  dueDate: string;
  note: string | null;
  channel: string | null;
  done: boolean;
  lead: { id: string; name: string } | null;
};
type Appointment = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
  leadId: string | null;
  lead: { id: string; name: string } | null;
};

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const BUCKET_ORDER: DueBucket[] = ["scaduto", "oggi", "prossimi"];
const BUCKET_DOT: Record<DueBucket, string> = {
  scaduto: "bg-red-500",
  oggi: "bg-amber-500",
  prossimi: "bg-emerald-500",
};

export default function CalendarioPage() {
  const [leads, setLeads] = React.useState<LeadLite[]>([]);
  const [followUps, setFollowUps] = React.useState<FollowUp[]>([]);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [loading, setLoading] = React.useState(true);

  // form follow-up
  const [fLead, setFLead] = React.useState("");
  const [fDue, setFDue] = React.useState("");
  const [fChannel, setFChannel] = React.useState("chiamata");
  const [fNote, setFNote] = React.useState("");
  const [savingF, setSavingF] = React.useState(false);

  // form appuntamento
  const [aTitle, setATitle] = React.useState("");
  const [aStart, setAStart] = React.useState("");
  const [aEnd, setAEnd] = React.useState("");
  const [aLead, setALead] = React.useState("");
  const [aNotes, setANotes] = React.useState("");
  const [savingA, setSavingA] = React.useState(false);
  const [autoLoading, setAutoLoading] = React.useState(false);
  const [autoMsg, setAutoMsg] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    const [lr, fr, ar] = await Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/followups").then((r) => r.json()),
      fetch("/api/appointments").then((r) => r.json()),
    ]);
    setLeads((lr.leads ?? []).map((l: any) => ({ id: l.id, name: l.name })));
    setFollowUps(fr.followUps ?? []);
    setAppointments(ar.appointments ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadAll();
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("lead");
    if (preset) {
      setFLead(preset);
      setALead(preset);
    }
  }, [loadAll]);

  async function createFollowUp() {
    if (!fLead || !fDue) return;
    setSavingF(true);
    await fetch("/api/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: fLead, dueDate: fDue, channel: fChannel, note: fNote || null }),
    });
    setFDue("");
    setFNote("");
    setSavingF(false);
    loadAll();
  }

  async function toggleDone(f: FollowUp) {
    setFollowUps((prev) => prev.map((x) => (x.id === f.id ? { ...x, done: !x.done } : x)));
    await fetch("/api/followups/" + f.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !f.done }),
    });
  }

  async function removeFollowUp(id: string) {
    setFollowUps((prev) => prev.filter((x) => x.id !== id));
    await fetch("/api/followups/" + id, { method: "DELETE" });
  }

  async function createAppointment() {
    if (!aTitle || !aStart) return;
    setSavingA(true);
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: aTitle,
        startsAt: aStart,
        endsAt: aEnd || null,
        leadId: aLead || null,
        notes: aNotes || null,
      }),
    });
    setATitle("");
    setAStart("");
    setAEnd("");
    setANotes("");
    setSavingA(false);
    loadAll();
  }

  async function removeAppointment(id: string) {
    setAppointments((prev) => prev.filter((x) => x.id !== id));
    await fetch("/api/appointments/" + id, { method: "DELETE" });
  }

  async function runAutoFollowups() {
    setAutoLoading(true);
    setAutoMsg(null);
    try {
      const res = await fetch("/api/followups/auto", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setAutoMsg("Creati " + data.created + " promemoria automatici (su " + data.scanned + " lead controllati).");
        await loadAll();
      } else {
        setAutoMsg("Operazione non riuscita.");
      }
    } catch {
      setAutoMsg("Errore di rete.");
    }
    setAutoLoading(false);
  }

  const pending = followUps.filter((f) => !f.done);
  const completed = followUps.filter((f) => f.done);
  const grouped: Record<DueBucket, FollowUp[]> = { scaduto: [], oggi: [], prossimi: [] };
  for (const f of pending) grouped[dueBucket(f.dueDate)].push(f);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario & Follow-up</h1>
          <p className="text-muted-foreground">
            Promemoria di ricontatto e appuntamenti, tutto in un unico posto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={runAutoFollowups} disabled={autoLoading}>
            {autoLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Genera promemoria automatici
          </Button>
          <a href="/api/appointments/ics">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> Esporta .ics
            </Button>
          </a>
        </div>
      </div>
      {autoMsg ? (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          {autoMsg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Nuovo follow-up */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Bell className="h-5 w-5" /> Nuovo promemoria
            </h2>
            <div className="space-y-1.5">
              <Label>Lead da ricontattare</Label>
              <select className={SELECT_CLASS} value={fLead} onChange={(e) => setFLead(e.target.value)}>
                <option value="">Seleziona un lead...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Quando</Label>
                <Input type="datetime-local" value={fDue} onChange={(e) => setFDue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Canale</Label>
                <select className={SELECT_CLASS} value={fChannel} onChange={(e) => setFChannel(e.target.value)}>
                  {Object.keys(FOLLOWUP_CHANNEL_LABELS).map((c) => (
                    <option key={c} value={c}>{FOLLOWUP_CHANNEL_LABELS[c]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nota (opzionale)</Label>
              <Textarea value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="Es. richiamare dopo la pausa estiva" />
            </div>
            <Button onClick={createFollowUp} disabled={savingF || !fLead || !fDue}>
              {savingF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Aggiungi promemoria
            </Button>
          </CardContent>
        </Card>

        {/* Nuovo appuntamento */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5" /> Nuovo appuntamento
            </h2>
            <div className="space-y-1.5">
              <Label>Titolo</Label>
              <Input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Es. Sopralluogo / call demo" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Inizio</Label>
                <Input type="datetime-local" value={aStart} onChange={(e) => setAStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fine (opzionale)</Label>
                <Input type="datetime-local" value={aEnd} onChange={(e) => setAEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lead collegato (opzionale)</Label>
              <select className={SELECT_CLASS} value={aLead} onChange={(e) => setALead(e.target.value)}>
                <option value="">Nessuno</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Note (opzionale)</Label>
              <Textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} placeholder="Dettagli, luogo, link alla call..." />
            </div>
            <Button onClick={createAppointment} disabled={savingA || !aTitle || !aStart}>
              {savingA ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Aggiungi appuntamento
            </Button>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Promemoria */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Bell className="h-5 w-5" /> Da ricontattare
              <span className="text-sm font-normal text-muted-foreground">({pending.length})</span>
            </h2>

            {pending.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nessun promemoria in sospeso.</CardContent></Card>
            ) : (
              BUCKET_ORDER.map((b) =>
                grouped[b].length === 0 ? null : (
                  <div key={b} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className={"h-2 w-2 rounded-full " + BUCKET_DOT[b]} />
                      {BUCKET_LABELS[b]}
                    </div>
                    {grouped[b].map((f) => (
                      <Card key={f.id}>
                        <CardContent className="flex items-start gap-3 p-4">
                          <button
                            onClick={() => toggleDone(f)}
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border hover:bg-accent"
                            title="Segna come fatto"
                          >
                            <Check className="h-3.5 w-3.5 opacity-0" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{f.lead?.name ?? "(lead rimosso)"}</span>
                              {f.channel ? (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                  {FOLLOWUP_CHANNEL_LABELS[f.channel] ?? f.channel}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" /> {formatDateTime(f.dueDate)}
                            </div>
                            {f.note ? <p className="mt-1 text-sm">{f.note}</p> : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {f.lead ? (
                              <Link href={"/crm/" + f.lead.id}>
                                <Button variant="ghost" size="icon" title="Apri scheda">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                            ) : null}
                            <Button variant="ghost" size="icon" onClick={() => removeFollowUp(f.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              )
            )}

            {completed.length > 0 ? (
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Completati ({completed.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {completed.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <button onClick={() => toggleDone(f)} title="Ripristina">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <span className="line-through">{f.lead?.name ?? "(lead rimosso)"}</span>
                      <span>- {formatDateTime(f.dueDate)}</span>
                      <button className="ml-auto" onClick={() => removeFollowUp(f.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          {/* Appuntamenti */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5" /> Appuntamenti
              <span className="text-sm font-normal text-muted-foreground">({appointments.length})</span>
            </h2>
            {appointments.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nessun appuntamento in agenda.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{a.title}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> {formatDateTime(a.startsAt)}
                          {a.endsAt ? " - " + formatDateTime(a.endsAt) : ""}
                        </div>
                        {a.lead ? (
                          <Link href={"/crm/" + a.lead.id} className="mt-1 inline-block text-sm text-primary underline">
                            {a.lead.name}
                          </Link>
                        ) : null}
                        {a.notes ? <p className="mt-1 text-sm">{a.notes}</p> : null}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAppointment(a.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
