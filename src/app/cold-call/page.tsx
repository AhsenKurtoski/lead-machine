"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { coldCallScriptToText, type ColdCallScript } from "@/lib/cold-call";
import {
  Loader2,
  RefreshCw,
  Phone,
  PhoneCall,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  Star,
} from "lucide-react";

type Item = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  category: string | null;
  status: string;
  priorityScore: number;
  kind: "con_sito" | "senza_sito";
  script: ColdCallScript;
};

export default function ColdCallPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [all, setAll] = React.useState(false);
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [aiText, setAiText] = React.useState<Record<string, string>>({});
  const [aiNote, setAiNote] = React.useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = React.useState<Record<string, boolean>>({});
  const [copied, setCopied] = React.useState<Record<string, boolean>>({});
  const [done, setDone] = React.useState<Record<string, boolean>>({});
  const [seqMode, setSeqMode] = React.useState(false);
  const [seqIndex, setSeqIndex] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cold-call" + (all ? "?all=1" : ""));
      const data = await res.json();
      setItems(data.ok ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [all]);

  React.useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setOpen((s) => Object.assign({}, s, { [id]: !s[id] }));
  }

  async function genAi(id: string) {
    setAiLoading((s) => Object.assign({}, s, { [id]: true }));
    setAiNote((s) => Object.assign({}, s, { [id]: "" }));
    try {
      const res = await fetch("/api/cold-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, action: "ai" }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiText((s) => Object.assign({}, s, { [id]: data.text }));
        setOpen((s) => Object.assign({}, s, { [id]: true }));
      } else {
        setAiNote((s) => Object.assign({}, s, { [id]: data.note || data.error || "Errore" }));
      }
    } catch {
      setAiNote((s) => Object.assign({}, s, { [id]: "Errore di rete." }));
    } finally {
      setAiLoading((s) => Object.assign({}, s, { [id]: false }));
    }
  }

  async function copyScript(it: Item) {
    const text = aiText[it.id] || coldCallScriptToText(it.script);
    try {
      await navigator.clipboard.writeText(text);
      setCopied((s) => Object.assign({}, s, { [it.id]: true }));
      setTimeout(() => setCopied((s) => Object.assign({}, s, { [it.id]: false })), 1800);
    } catch {
      /* clipboard non disponibile */
    }
  }

  async function markCalled(id: string) {
    setDone((s) => Object.assign({}, s, { [id]: true }));
    try {
      await fetch("/api/cold-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, action: "log", esito: "Chiamata effettuata" }),
      });
    } catch {
      /* ignora */
    }
  }

  function startSeq() {
    setSeqIndex(0);
    setSeqMode(true);
  }
  function seqNext() {
    setSeqIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
  }
  function seqPrev() {
    setSeqIndex((i) => Math.max(i - 1, 0));
  }
  async function markCalledAndNext(id: string) {
    await markCalled(id);
    seqNext();
  }

  const conSito = items.filter((i) => i.kind === "con_sito").length;
  const senzaSito = items.filter((i) => i.kind === "senza_sito").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Script per telefonate (Cold Call)</h1>
          <p className="text-muted-foreground">
            Per ogni lead hai uno script pronto e su misura. Chiami, leggi e fissi l'appuntamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 ? (
            <Button size="sm" onClick={() => (seqMode ? setSeqMode(false) : startSeq())}>
              <PhoneCall className="h-4 w-4" /> {seqMode ? "Esci dalla sequenza" : "Modalita sequenza"}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setAll((v) => !v)}>
            {all ? "Solo da chiamare" : "Mostra tutti"}
          </Button>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Aggiorna
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <div className="text-2xl font-bold">{items.length}</div>
              <div className="text-xs text-muted-foreground">Lead chiamabili</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{senzaSito}</div>
              <div className="text-xs text-muted-foreground">Senza sito (nuovo sito)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Star className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-2xl font-bold">{conSito}</div>
              <div className="text-xs text-muted-foreground">Con sito (restyling)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {seqMode && items.length > 0 ? (
        (() => {
          const it = items[Math.min(seqIndex, items.length - 1)];
          return (
            <Card>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Lead {Math.min(seqIndex + 1, items.length)} di {items.length}
                  </span>
                  <Badge variant={it.kind === "senza_sito" ? "default" : "secondary"}>
                    {it.kind === "senza_sito" ? "Nuovo sito" : "Restyling"}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{it.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {(it.category || "-") + (it.city ? " \u00B7 " + it.city : "")}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {it.phone ? (
                    <a href={"tel:" + it.phone}>
                      <Button size="sm">
                        <PhoneCall className="h-4 w-4" /> Chiama {it.phone}
                      </Button>
                    </a>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => genAi(it.id)} disabled={aiLoading[it.id]}>
                    {aiLoading[it.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Versione AI
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyScript(it)}>
                    {copied[it.id] ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Copia
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {it.script.sections.map((sec, si) => (
                  <div key={si}>
                    <p className="text-sm font-semibold">{sec.title}</p>
                    <ul className="mt-1 space-y-1">
                      {sec.lines.map((l, li) => (
                        <li key={li} className="text-sm text-muted-foreground">{l}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div>
                  <p className="text-sm font-semibold">4. Gestione delle obiezioni</p>
                  <div className="mt-2 space-y-2">
                    {it.script.objections.map((o, oi) => (
                      <div key={oi} className="rounded-md border border-input p-2">
                        <p className="text-sm font-medium">Se dice: {o.obiezione}</p>
                        <p className="text-sm text-muted-foreground">Rispondi: {o.risposta}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {aiText[it.id] ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/20">
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-amber-500" /> Versione personalizzata con AI
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{aiText[it.id]}</p>
                  </div>
                ) : null}
                {aiNote[it.id] ? (
                  <p className="text-sm text-blue-600 dark:text-blue-400">{aiNote[it.id]}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={seqPrev} disabled={seqIndex === 0}>
                    Precedente
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={seqNext} disabled={seqIndex >= items.length - 1}>
                      Salta
                    </Button>
                    <Button size="sm" onClick={() => markCalledAndNext(it.id)}>
                      <Check className="h-4 w-4" /> Chiamato, prossimo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun lead con numero di telefono. Fai una ricerca lead oppure mostra tutti gli stati.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <Card key={it.id} className={done[it.id] ? "opacity-70" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{it.name}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={it.kind === "senza_sito" ? "default" : "secondary"}>
                      {it.kind === "senza_sito" ? "Nuovo sito" : "Restyling"}
                    </Badge>
                    <span className="text-muted-foreground">
                      {(it.category || "-") + (it.city ? " \u00B7 " + it.city : "")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Star className="h-3 w-3 fill-amber-500" /> {it.priorityScore}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {it.phone ? (
                    <a href={"tel:" + it.phone}>
                      <Button size="sm">
                        <PhoneCall className="h-4 w-4" /> Chiama {it.phone}
                      </Button>
                    </a>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => toggle(it.id)}>
                    <ChevronDown className={"h-4 w-4 transition-transform " + (open[it.id] ? "rotate-180" : "")} /> Script
                  </Button>
                </div>
              </CardHeader>

              {open[it.id] ? (
                <CardContent className="space-y-4">
                  {it.script.sections.map((sec, si) => (
                    <div key={si}>
                      <p className="text-sm font-semibold">{sec.title}</p>
                      <ul className="mt-1 space-y-1">
                        {sec.lines.map((l, li) => (
                          <li key={li} className="text-sm text-muted-foreground">{l}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div>
                    <p className="text-sm font-semibold">4. Gestione delle obiezioni</p>
                    <div className="mt-2 space-y-2">
                      {it.script.objections.map((o, oi) => (
                        <div key={oi} className="rounded-md border border-input p-2">
                          <p className="text-sm font-medium">Se dice: {o.obiezione}</p>
                          <p className="text-sm text-muted-foreground">Rispondi: {o.risposta}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {aiText[it.id] ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/20">
                      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                        <Sparkles className="h-4 w-4 text-amber-500" /> Versione personalizzata con AI
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{aiText[it.id]}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => genAi(it.id)} disabled={aiLoading[it.id]}>
                      {aiLoading[it.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {aiText[it.id] ? "Rigenera con AI" : "Versione AI"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyScript(it)}>
                      {copied[it.id] ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Copia script
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => markCalled(it.id)} disabled={done[it.id]}>
                      <Check className="h-4 w-4" /> {done[it.id] ? "Chiamato" : "Segna chiamato"}
                    </Button>
                  </div>
                  {aiNote[it.id] ? (
                    <p className="text-sm text-blue-600 dark:text-blue-400">{aiNote[it.id]}</p>
                  ) : null}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
