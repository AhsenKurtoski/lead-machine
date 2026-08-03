"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUOTE_PRESETS, computeDeposit, formatEuro } from "@/lib/quotes";

// Calcolatore preventivo rapido: l'utente seleziona i servizi dal listino e
// vede subito il totale stimato e l'acconto del 30%.
export function PriceEstimator() {
  const [sel, setSel] = React.useState<number[]>([]);

  function toggle(i: number) {
    setSel((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  const total = sel.reduce((s, i) => s + (QUOTE_PRESETS[i]?.price || 0), 0);
  const dep = computeDeposit(total, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calcolatore preventivo rapido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Seleziona i servizi per stimare al volo il prezzo e l'acconto.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUOTE_PRESETS.map((p, i) => {
            const active = sel.includes(i);
            return (
              <label
                key={i}
                className={
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition-colors " +
                  (active ? "border-primary bg-primary/5" : "hover:bg-accent")
                }
              >
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={active} onChange={() => toggle(i)} className="h-4 w-4" />
                  <span className="min-w-0">{p.description}</span>
                </span>
                <span className="shrink-0 font-medium text-muted-foreground">{formatEuro(p.price)}</span>
              </label>
            );
          })}
        </div>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between text-base font-bold">
            <span>Totale stimato</span>
            <span className="text-primary">{formatEuro(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Acconto 30%</span>
            <span className="font-medium">{formatEuro(dep.deposit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo alla consegna</span>
            <span className="font-medium">{formatEuro(dep.balance)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
