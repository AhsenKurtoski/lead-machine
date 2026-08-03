import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QUOTE_PRESETS, formatEuro } from "@/lib/quotes";
import { PriceEstimator } from "@/components/price-estimator";
import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

const PACKAGES = [
  {
    name: "Starter",
    price: 290,
    tagline: "Per iniziare a farsi trovare online",
    highlight: false,
    features: [
      "Sito vetrina di 1 pagina (one-page)",
      "Design responsive (mobile + desktop)",
      "Scheda Google Business / Maps",
      "Modulo contatti / prenotazione base",
    ],
  },
  {
    name: "Business",
    price: 890,
    tagline: "La scelta giusta per la maggior parte delle attivita",
    highlight: true,
    features: [
      "Sito multipagina (3-5 pagine)",
      "Sistema di prenotazione online",
      "Ottimizzazione SEO locale",
      "Galleria foto + menu/catalogo",
      "Collegamento social e WhatsApp",
    ],
  },
  {
    name: "Premium",
    price: 1290,
    tagline: "Presenza online completa e curata",
    highlight: false,
    features: [
      "Tutto del piano Business",
      "Logo e identita visiva",
      "Gestione social iniziale",
      "Manutenzione annuale inclusa",
      "Supporto prioritario",
    ],
  },
];

export default function ListinoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Listino servizi</h1>
        <p className="text-muted-foreground">
          Pacchetti e prezzi pensati per le piccole attivita della zona di Feltre. Prezzi indicativi, personalizzabili nel preventivo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <Card
            key={pkg.name}
            className={pkg.highlight ? "relative border-primary shadow-lg" : "relative"}
          >
            {pkg.highlight ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Piu richiesto</Badge>
            ) : null}
            <CardHeader>
              <CardTitle className="text-xl">{pkg.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{pkg.tagline}</p>
              <div className="pt-2 text-3xl font-bold">
                {formatEuro(pkg.price)}
                <span className="text-sm font-normal text-muted-foreground"> da</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {pkg.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{f}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listino dettagliato (singoli servizi)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {QUOTE_PRESETS.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{p.description}</span>
                <span className="shrink-0 font-medium">{formatEuro(p.price)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Manutenzione consigliata a pacchetto, semestrale o annuale (evita il canone mensile fisso). Prezzi al netto di eventuale ritenuta d'acconto; prestazione occasionale, non soggetta a IVA.
          </p>
        </CardContent>
      </Card>

      <PriceEstimator />
    </div>
  );
}
