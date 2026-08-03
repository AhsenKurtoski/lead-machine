"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Loader2, Sparkles, Search, Wand2, Database } from "lucide-react";

// Azioni "web" per un lead: genera il sito demo con l'AI (con prompt
// personalizzato), apre la demo e cerca il sito ufficiale su Google.
export function LeadWebActions({
  leadId,
  initialPrompt,
}: {
  leadId: string;
  website?: string | null;
  initialPrompt?: string | null;
}) {
  const [genLoading, setGenLoading] = React.useState(false);
  const [findLoading, setFindLoading] = React.useState(false);
  const [enrichLoading, setEnrichLoading] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [noteKind, setNoteKind] = React.useState<"ok" | "warn">("ok");
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [prompt, setPrompt] = React.useState(initialPrompt ?? "");

  function show(message: string, kind: "ok" | "warn") {
    setNote(message);
    setNoteKind(kind);
  }

  async function generateDemo() {
    setGenLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, force: true, customPrompt: prompt }),
      });
      const data = await res.json();
      if (data.ok) {
        const via = data.provider === "gemini" ? "Gemini" : data.provider === "groq" ? "Groq" : "AI";
        show("Sito demo generato con " + via + ". Apertura in corso...", "ok");
        window.open("/demo/" + leadId, "_blank");
      } else {
        show(data.note || data.error || "Impossibile generare il sito demo con l'AI.", "warn");
      }
    } catch {
      show("Errore di rete durante la generazione.", "warn");
    }
    setGenLoading(false);
  }

  async function findWebsite() {
    setFindLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/leads/" + leadId + "/find-website", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const f = data.found;
        if (f.hasWebsite && f.website) {
          show("Sito trovato (confidenza " + (f.confidence || "?") + "): " + f.website + ". Aggiorno...", "ok");
        } else {
          show("Nessun sito ufficiale trovato. " + (f.note || ""), "ok");
        }
        setTimeout(() => window.location.reload(), 1400);
      } else {
        show(data.note || data.error || "Ricerca non riuscita.", "warn");
      }
    } catch {
      show("Errore di rete durante la ricerca.", "warn");
    }
    setFindLoading(false);
  }

  async function enrichLead() {
    setEnrichLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/leads/" + leadId + "/enrich", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const fields =
          Array.isArray(data.updated) && data.updated.length > 0
            ? data.updated.join(", ")
            : "note aggiornate";
        show("Scheda arricchita con l'AI (" + fields + "). Aggiorno...", "ok");
        setTimeout(() => window.location.reload(), 1400);
      } else {
        show(data.note || data.error || "Arricchimento non riuscito.", "warn");
      }
    } catch {
      show("Errore di rete durante l'arricchimento.", "warn");
    }
    setEnrichLoading(false);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={generateDemo} disabled={genLoading}>
          {genLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-4 w-4" />
          )}
          Genera sito (AI)
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowPrompt((v) => !v)}>
          <Wand2 className="mr-1 h-4 w-4" />
          {showPrompt ? "Nascondi istruzioni" : "Istruzioni AI"}
        </Button>
        <a href={"/demo/" + leadId} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <Globe className="mr-1 h-4 w-4" /> Apri sito demo
          </Button>
        </a>
        <Button variant="outline" size="sm" onClick={findWebsite} disabled={findLoading}>
          {findLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-1 h-4 w-4" />
          )}
          Trova sito con AI
        </Button>
        <Button variant="outline" size="sm" onClick={enrichLead} disabled={enrichLoading}>
          {enrichLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-1 h-4 w-4" />
          )}
          Arricchisci (AI)
        </Button>
      </div>

      {showPrompt ? (
        <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
          <label className="text-xs font-medium text-muted-foreground">
            Cosa deve fare il sito? (istruzioni per l'AI)
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder={"Es. Sito per pizzeria con menu, galleria foto, sezione 'Chi siamo', modulo di prenotazione tavolo via FormSubmit, colori caldi rosso/legno, sezione recensioni e mappa."}
          />
          <p className="text-xs text-muted-foreground">
            Lascia vuoto per un sito premium automatico. Le istruzioni vengono salvate sul lead e riusate alla prossima generazione.
          </p>
        </div>
      ) : null}

      {note ? (
        <p
          className={
            "text-xs " +
            (noteKind === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground")
          }
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
