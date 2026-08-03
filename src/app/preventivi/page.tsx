"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  computeTotals,
  computeDeposit,
  formatEuro,
  QUOTE_PRESETS,
  QUOTE_PAYMENT_TERMS,
  QUOTE_STATUS_LABELS,
  quoteValidityState,
  type QuoteItem,
} from "@/lib/quotes";
import { FileText, Plus, Trash2, ExternalLink, Loader2, Sparkles, Copy, Download } from "lucide-react";

type LeadLite = { id: string; name: string };
type QuoteRow = {
  id: string;
  number: string;
  title: string | null;
  status: string;
  items: string;
  discount: number;
  taxRate: number;
  depositPercent?: number;
  paymentTerms?: string | null;
  deliveryTime?: string | null;
  notes?: string | null;
  validUntil?: string | null;
  createdAt: string;
  lead: { id: string; name: string } | null;
};

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function rowTotal(q: QuoteRow): number {
  let items: QuoteItem[] = [];
  try {
    items = JSON.parse(q.items || "[]");
  } catch {
    items = [];
  }
  return computeTotals(items, q.discount, 0).total;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ValidityBadge({ q }: { q: QuoteRow }) {
  const v = quoteValidityState(q.validUntil);
  if (v.state === "none") return null;
  const cls =
    v.state === "expired"
      ? "bg-red-500/15 text-red-600 dark:text-red-400"
      : v.state === "soon"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  return (
    <Badge variant="outline" className={cls}>
      {v.label}
    </Badge>
  );
}

export default function PreventiviPage() {
  const [leads, setLeads] = React.useState<LeadLite[]>([]);
  const [quotes, setQuotes] = React.useState<QuoteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiNote, setAiNote] = React.useState<string | null>(null);

  const [leadId, setLeadId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [items, setItems] = React.useState<QuoteItem[]>([
    { description: "", qty: 1, price: 0 },
  ]);
  const [discount, setDiscount] = React.useState(0);
  const [depositPercent, setDepositPercent] = React.useState(30);
  const [paymentTerms, setPaymentTerms] = React.useState(QUOTE_PAYMENT_TERMS[0]);
  const [deliveryTime, setDeliveryTime] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [validUntil, setValidUntil] = React.useState(addDaysIso(30));

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    const [lr, qr] = await Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/quotes").then((r) => r.json()),
    ]);
    setLeads((lr.leads ?? []).map((l: any) => ({ id: l.id, name: l.name })));
    setQuotes(qr.quotes ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadAll();
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("lead");
    if (preset) setLeadId(preset);
  }, [loadAll]);

  function updateItem(idx: number, patch: Partial<QuoteItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: 1, price: 0 }]);
  }
  function addPreset(p: QuoteItem) {
    setItems((prev) => {
      const cleaned = prev.filter((it) => it.description.trim());
      return [...cleaned, { ...p }];
    });
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const validItems = items.filter((it) => it.description.trim());
  const totals = computeTotals(validItems, discount, 0);
  const deposit = computeDeposit(totals.total, depositPercent);

  async function save() {
    if (!leadId || validItems.length === 0) return;
    setSaving(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        title: title || null,
        items: validItems,
        discount,
        taxRate: 0,
        depositPercent,
        paymentTerms: paymentTerms || null,
        deliveryTime: deliveryTime || null,
        notes: notes || null,
        validUntil: validUntil || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.quote) {
      window.location.href = "/preventivo/" + data.quote.id;
    }
  }

  async function aiDraft() {
    if (!leadId) {
      setAiNote("Seleziona prima un cliente (lead).");
      return;
    }
    setAiLoading(true);
    setAiNote(null);
    try {
      const res = await fetch("/api/quotes/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.items) && data.items.length) {
        setItems(data.items);
        const via =
          data.provider === "gemini" ? "Gemini" : data.provider === "groq" ? "Groq" : "AI";
        setAiNote(
          "Bozza generata con " + via + ". Controlla e modifica le voci, poi crea il preventivo."
        );
      } else {
        setAiNote(data.note || data.error || "Impossibile generare la bozza.");
      }
    } catch {
      setAiNote("Errore di rete durante la generazione.");
    } finally {
      setAiLoading(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    await fetch("/api/quotes/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function duplicate(q: QuoteRow) {
    if (!q.lead?.id) return;
    let parsed: QuoteItem[] = [];
    try {
      parsed = JSON.parse(q.items || "[]");
    } catch {
      parsed = [];
    }
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: q.lead.id,
        title: q.title ? q.title + " (copia)" : null,
        items: parsed,
        discount: q.discount,
        taxRate: 0,
        depositPercent: q.depositPercent ?? 0,
        paymentTerms: q.paymentTerms ?? null,
        deliveryTime: q.deliveryTime ?? null,
        notes: q.notes ?? null,
        validUntil: addDaysIso(30),
      }),
    });
    const data = await res.json();
    if (data.quote) window.location.href = "/preventivo/" + data.quote.id;
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo preventivo?")) return;
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    await fetch("/api/quotes/" + id, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preventivi</h1>
        <p className="text-muted-foreground">
          Crea preventivi professionali brandizzati e salvali in PDF (Stampa - Salva come PDF). Nessuna IVA: pensati per prestazione occasionale.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Plus className="h-5 w-5" /> Nuovo preventivo
            </h2>
            <Button variant="outline" size="sm" onClick={aiDraft} disabled={aiLoading || !leadId}>
              {aiLoading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Genera bozza con AI
            </Button>
          </div>
          {aiNote ? <p className="text-xs text-muted-foreground">{aiNote}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente (lead)</Label>
              <select
                className={SELECT_CLASS + " w-full"}
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              >
                <option value="">Seleziona un lead...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Titolo (opzionale)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Proposta sito web + prenotazioni"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Voci</Label>
              <select
                className={SELECT_CLASS}
                value=""
                onChange={(e) => {
                  const p = QUOTE_PRESETS[Number(e.target.value)];
                  if (p) addPreset(p);
                  e.target.value = "";
                }}
              >
                <option value="">+ Aggiungi servizio dal listino...</option>
                {QUOTE_PRESETS.map((p, i) => (
                  <option key={i} value={i}>
                    {p.description} ({formatEuro(p.price)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-[200px] flex-1"
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    placeholder="Descrizione servizio"
                  />
                  <Input
                    type="number"
                    className="w-20"
                    value={it.qty}
                    onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                    placeholder="Qta"
                  />
                  <Input
                    type="number"
                    className="w-28"
                    value={it.price}
                    onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                    placeholder="Prezzo"
                  />
                  <span className="w-24 text-right text-sm text-muted-foreground">
                    {formatEuro((Number(it.qty) || 0) * (Number(it.price) || 0))}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" /> Aggiungi voce
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Sconto (EUR)</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Acconto richiesto (%)</Label>
              <Input
                type="number"
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                placeholder="30"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tempi di consegna</Label>
              <Input
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="Es. 10 giorni lavorativi"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Condizioni di pagamento</Label>
            <select
              className={SELECT_CLASS + " w-full"}
              value=""
              onChange={(e) => {
                const t = QUOTE_PAYMENT_TERMS[Number(e.target.value)];
                if (t) setPaymentTerms(t);
                e.target.value = "";
              }}
            >
              <option value="">Scegli una condizione dal listino...</option>
              {QUOTE_PAYMENT_TERMS.map((t, i) => (
                <option key={i} value={i}>{t}</option>
              ))}
            </select>
            <Input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Modalita di pagamento"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Valido fino al</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                className="w-44"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setValidUntil(addDaysIso(15))}>
                15 giorni
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setValidUntil(addDaysIso(30))}>
                30 giorni
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setValidUntil(addDaysIso(60))}>
                60 giorni
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cosa e incluso, revisioni, tempistiche, garanzie..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Totale{" "}
              <span className="text-base font-bold text-foreground">{formatEuro(totals.total)}</span>
              {depositPercent > 0 ? (
                <span className="ml-2">
                  · Acconto {deposit.percent}%: <span className="font-medium text-foreground">{formatEuro(deposit.deposit)}</span> · Saldo {formatEuro(deposit.balance)}
                </span>
              ) : null}
            </div>
            <Button onClick={save} disabled={saving || !leadId || validItems.length === 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Crea e apri PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Preventivi salvati</h2>
          <a href="/api/quotes/export">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> Esporta CSV
            </Button>
          </a>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : quotes.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nessun preventivo ancora.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <Card key={q.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {q.number} - {q.lead?.name ?? "(lead rimosso)"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {q.title || "Senza titolo"} - {formatEuro(rowTotal(q))}
                    </div>
                    <div className="mt-1">
                      <ValidityBadge q={q} />
                    </div>
                  </div>
                  <select
                    className={SELECT_CLASS}
                    value={q.status}
                    onChange={(e) => changeStatus(q.id, e.target.value)}
                  >
                    {Object.keys(QUOTE_STATUS_LABELS).map((s) => (
                      <option key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <Link href={"/preventivo/" + q.id} target="_blank">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-1 h-4 w-4" /> Apri PDF
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => duplicate(q)}>
                    <Copy className="mr-1 h-4 w-4" /> Duplica
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(q.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
