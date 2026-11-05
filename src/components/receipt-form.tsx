"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Loader2, Check } from "lucide-react";
import { RECEIPT_METHODS } from "@/lib/receipts";

type LeadOption = { id: string; name: string };

// Registra una ricevuta di pagamento: chi ha pagato, quanto, come e quando.
// Nessun campo fiscale: questa e una prova di pagamento, non una fattura.
export function ReceiptForm({
  leads,
  defaultLeadId,
}: {
  leads: LeadOption[];
  defaultLeadId?: string;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = React.useState(defaultLeadId ?? leads[0]?.id ?? "");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("contanti");
  const [paidAt, setPaidAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId) {
      setError("Scegli l'attivita che ha pagato.");
      return;
    }
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, description, amount, method, paidAt, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setError(data?.error || "Non e stato possibile registrare la ricevuta.");
        return;
      }
      setDescription("");
      setAmount("");
      setNotes("");
      setDone(true);
      router.refresh();
    } catch {
      setError("Errore di rete: riprova.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuova ricevuta di pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Attivita che ha pagato</span>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {leads.length === 0 ? <option value="">Nessuna attivita in archivio</option> : null}
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Importo pagato</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="es. 150,00"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Metodo di pagamento</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {RECEIPT_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Data del pagamento</span>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Cosa e stato pagato</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="es. Realizzazione sito web - saldo finale"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Note (facoltative)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. pagamento ricevuto in contanti in sede"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving || leads.length === 0}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="mr-1 h-4 w-4" />
              )}
              Registra ricevuta
            </Button>
            {done ? (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" /> Ricevuta registrata.
              </span>
            ) : null}
            {error ? <span className="text-sm text-red-600 dark:text-red-400">{error}</span> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
