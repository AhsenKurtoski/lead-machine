import * as React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiscalCalculator } from "@/components/fiscal-calculator";
import { quoteTotalFromRaw, formatEuro, OCCASIONAL_THRESHOLD } from "@/lib/quotes";
import { Receipt, TrendingUp, PiggyBank } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FiscoPage() {
  const year = new Date().getFullYear();
  const [accepted, sent] = await Promise.all([
    prisma.quote.findMany({ where: { status: "accettato" } }),
    prisma.quote.findMany({ where: { status: "inviato" } }),
  ]);

  const thisYear = accepted.filter((q) => new Date(q.createdAt).getFullYear() === year);
  const revenue = thisYear.reduce((s, q) => s + quoteTotalFromRaw(q.items, q.discount, q.taxRate), 0);
  const pipeline = sent.reduce((s, q) => s + quoteTotalFromRaw(q.items, q.discount, q.taxRate), 0);

  const pct = Math.min(100, Math.round((revenue / OCCASIONAL_THRESHOLD) * 100));
  const remaining = Math.max(0, OCCASIONAL_THRESHOLD - revenue);
  const barStyle: React.CSSProperties = { width: pct + "%" };

  const kind = revenue >= OCCASIONAL_THRESHOLD ? "red" : revenue >= OCCASIONAL_THRESHOLD * 0.8 ? "amber" : "green";
  const barColor = kind === "red" ? "bg-red-500" : kind === "amber" ? "bg-amber-500" : "bg-emerald-500";
  const message =
    kind === "red"
      ? "Hai superato i 5.000 EUR annui: scattano i contributi INPS Gestione Separata sulla parte eccedente. Parla con il commercialista e l'adulto intestatario per valutare la partita IVA."
      : kind === "amber"
      ? "Ti stai avvicinando alla soglia dei 5.000 EUR. Tieni monitorato: oltre quella cifra scattano i contributi INPS."
      : "Sei sotto la soglia dei 5.000 EUR: nessun contributo INPS dovuto. Continua cosi, sei in regola con la prestazione occasionale.";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro fiscale</h1>
        <p className="text-muted-foreground">
          Tieni sotto controllo la soglia dei 5.000 EUR/anno della prestazione occasionale e calcola la ritenuta d'acconto.
        </p>
      </div>

      <Card className="border-indigo-300 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20">
        <CardContent className="space-y-2 p-5 text-sm">
          <p className="font-semibold">Come funziona (a cosa servono questi documenti)</p>
          <p className="text-muted-foreground">
            Tu <strong>trovi i clienti</strong> e <strong>realizzi i siti</strong>. Il preventivo e la ricevuta servono perche <strong>sei tu a incassare dal cliente</strong> e a dargli qualcosa di professionale.
          </p>
          <p className="text-xs text-muted-foreground">
            Importante: questi sono strumenti indicativi. Verifica con un commercialista se rientri nella prestazione occasionale o se serve la partita IVA, e intesta contratti e incassi all'adulto di riferimento (sei minorenne).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Guadagno {year} (accettati)</p>
              <p className="mt-1 text-3xl font-bold">{formatEuro(revenue)}</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-emerald-500"><PiggyBank className="h-6 w-6" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Ancora disponibili</p>
              <p className="mt-1 text-3xl font-bold">{formatEuro(remaining)}</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-blue-500"><Receipt className="h-6 w-6" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Pipeline (inviati)</p>
              <p className="mt-1 text-3xl font-bold">{formatEuro(pipeline)}</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-purple-500"><TrendingUp className="h-6 w-6" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Soglia prestazione occasionale - {year}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{formatEuro(revenue)} di {formatEuro(OCCASIONAL_THRESHOLD)}</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div className={"h-full rounded-full transition-all " + barColor} style={barStyle} />
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <FiscalCalculator />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promemoria rapido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• <span className="font-medium text-foreground">Sotto 5.000 EUR/anno</span>: nessun contributo INPS.</p>
            <p>• <span className="font-medium text-foreground">Intestatario adulto</span>: contratti, ricevute e incassi a nome di un adulto (sei minorenne).</p>
            <p>• <span className="font-medium text-foreground">Ritenuta 20%</span>: la trattiene solo il cliente con partita IVA.</p>
            <p>• <span className="font-medium text-foreground">Manutenzione</span>: meglio semestrale/annuale o a pacchetto, evita il canone mensile fisso.</p>
            <div className="pt-2">
              <Link href="/ricevuta">
                <Button variant="outline" size="sm"><Receipt className="mr-1 h-4 w-4" /> Genera una ricevuta</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Nota: i calcoli si basano sui preventivi con stato "accettato" di quest'anno. Sono indicazioni generali, non sostituiscono il commercialista.
      </p>
    </div>
  );
}
