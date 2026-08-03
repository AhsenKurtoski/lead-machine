"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  MessageCircle,
  RefreshCw,
  Globe,
  Sparkles,
  CheckCircle2,
  ArrowRightCircle,
} from "lucide-react";

type WaLead = {
  leadId: string;
  name: string;
  city: string;
  category: string;
  priorityScore: number;
  kind: "con_sito" | "senza_sito";
  waNumber: string;
  body: string;
  waLink: string | null;
};

function buildLink(num: string, text: string): string {
  const n = (num || "").replace(/[^0-9]/g, "");
  if (!n) return "";
  return "https://wa.me/" + n + "?text=" + encodeURIComponent(text);
}

export default function WhatsAppPage() {
  const [leads, setLeads] = React.useState<WaLead[]>([]);
  const [bodies, setBodies] = React.useState<Record<string, string>>({});
  const [sent, setSent] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [onlyNew, setOnlyNew] = React.useState(true);
  const [conSito, setConSito] = React.useState(0);
  const [senzaSito, setSenzaSito] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/bulk?all=" + (onlyNew ? "0" : "1"));
      const data = await res.json();
      if (data.ok) {
        setLeads(data.leads);
        const map: Record<string, string> = {};
        for (const l of data.leads) map[l.leadId] = l.body;
        setBodies(map);
        setConSito(data.conSito);
        setSenzaSito(data.senzaSito);
      }
    } catch {
      // silenzioso
    }
    setLoading(false);
  }, [onlyNew]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function openAndSend(l: WaLead) {
    const text = bodies[l.leadId] ?? l.body;
    const link = buildLink(l.waNumber, text);
    if (link) window.open(link, "_blank");
    setSent((s) => Object.assign({}, s, { [l.leadId]: true }));
    try {
      await fetch("/api/whatsapp/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: l.leadId, body: text, waLink: link }),
      });
    } catch {
      // il messaggio e gia stato aperto: ignora l'errore di log
    }
  }

  // Invio "a catena": apre il primo lead non ancora inviato. Premendo di nuovo
  // si passa al successivo. I browser bloccano l'apertura di molte schede in una
  // volta, quindi l'invio uno-dopo-l'altro e il modo piu affidabile.
  async function sendNext() {
    const next = leads.find((l) => !sent[l.leadId]);
    if (next) await openAndSend(next);
  }

  const pending = leads.filter((l) => !sent[l.leadId]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-600" />
            WhatsApp automatico
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per ogni attivita il messaggio giusto e gia pronto. Tu apri WhatsApp e premi invio: al resto pensa il CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={onlyNew ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyNew((v) => !v)}
          >
            {onlyNew ? "Solo mai contattati" : "Tutti i lead"}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Aggiorna
          </Button>
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={sendNext}
            disabled={loading || pending === 0}
            title="Apre WhatsApp per il primo lead non ancora contattato. Premi di nuovo per il successivo."
          >
            <ArrowRightCircle className="mr-1 h-4 w-4" />
            Invia a catena ({pending})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pronti da inviare" value={pending} />
        <StatCard label="Totale idonei" value={leads.length} />
        <StatCard label="Con sito (restyling)" value={conSito} />
        <StatCard label="Senza sito (nuovo)" value={senzaSito} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carico i lead...
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun lead con numero WhatsApp valido. Aggiungi il numero ai lead dalla scheda CRM oppure cambia filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const isSent = Boolean(sent[l.leadId]);
            return (
              <Card
                key={l.leadId}
                className={isSent ? "border-green-500/40 bg-green-500/5" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {l.name}
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-4 w-4" /> Inviato
                        </span>
                      ) : null}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        {l.kind === "con_sito" ? (
                          <>
                            <Globe className="h-3 w-3" /> Restyling
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" /> Nuovo sito
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline">Priorita {l.priorityScore}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[l.category, l.city, "WhatsApp " + l.waNumber].filter(Boolean).join(" \u00B7 ")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    rows={5}
                    value={bodies[l.leadId] ?? l.body}
                    onChange={(e) =>
                      setBodies((b) => Object.assign({}, b, { [l.leadId]: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => openAndSend(l)}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <Send className="mr-1 h-4 w-4" />
                      {isSent ? "Riapri WhatsApp" : "Apri WhatsApp e invia"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
