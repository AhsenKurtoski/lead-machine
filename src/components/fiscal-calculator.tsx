"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeRitenuta, formatEuro } from "@/lib/quotes";

// Calcolatore ritenuta d'acconto 20%: l'utente inserisce il compenso lordo e
// vede quanto incassa davvero (netto) e quanto viene trattenuto come anticipo
// di tasse, distinguendo se il cliente e un'azienda con partita IVA o un privato.
export function FiscalCalculator() {
  const [gross, setGross] = React.useState(300);
  const [isBusiness, setIsBusiness] = React.useState(true);
  const r = computeRitenuta(gross, isBusiness);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calcolatore ritenuta d'acconto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Compenso lordo (EUR)</Label>
          <Input
            type="number"
            value={gross}
            onChange={(e) => setGross(Number(e.target.value))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isBusiness}
            onChange={(e) => setIsBusiness(e.target.checked)}
            className="h-4 w-4"
          />
          Il cliente e un'azienda con partita IVA (applica ritenuta 20%)
        </label>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Compenso lordo</span>
            <span className="font-medium">{formatEuro(r.gross)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ritenuta d'acconto (20%)</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">- {formatEuro(r.ritenuta)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Netto che incassi</span>
            <span className="text-emerald-600 dark:text-emerald-400">{formatEuro(r.net)}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          La ritenuta non e persa: e un anticipo di tasse versato allo Stato a tuo nome. Con un cliente privato (senza partita IVA) di norma non si applica.
        </p>
      </CardContent>
    </Card>
  );
}
