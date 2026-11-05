"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, MapPin, Rocket } from "lucide-react";

type Props = {
  initial: { brandName: string; owner: string; searchCity: string };
};

// Form del primo avvio: chiede i dati VERI dell'utente (brand, referente,
// citta di ricerca) invece di usare default personali. La citta viene
// geocodata lato server: se non si trova, si chiede di controllare il nome.
export function OnboardingForm({ initial }: Props) {
  const router = useRouter();
  const [brandName, setBrandName] = React.useState(initial.brandName);
  const [owner, setOwner] = React.useState(initial.owner);
  const [searchCity, setSearchCity] = React.useState(initial.searchCity);
  const [saving, setSaving] = React.useState(false);
  const [skipping, setSkipping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [geoWarning, setGeoWarning] = React.useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setGeoWarning(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, owner, searchCity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const firstError = data?.errors ? Object.values(data.errors)[0] : null;
        setError((firstError as string) || data?.error || "Salvataggio non riuscito.");
        return;
      }
      if (data.geocoded === false) {
        setGeoWarning(
          "Citta salvata, ma non sono riuscito a trovarne le coordinate: la ricerca andra' configurata dalle impostazioni."
        );
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Errore di rete durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    setSkipping(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skip: true }),
      });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-brand">Nome della tua attivita o agenzia</Label>
        <Input
          id="ob-brand"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="es. Rossi Web Agency"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-owner">Il tuo nome (referente)</Label>
        <Input
          id="ob-owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="es. Mario Rossi"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-city">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Citta in cui cerchi i clienti
          </span>
        </Label>
        <Input
          id="ob-city"
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
          placeholder="es. Milano, Italia"
          maxLength={100}
          required
        />
        <p className="text-xs text-muted-foreground">
          Usata per centrare le ricerche di attivita locali. Puoi cambiarla in ogni momento dalle impostazioni.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {geoWarning ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{geoWarning}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving || skipping}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
          Inizia a lavorare
        </Button>
        <Button variant="ghost" onClick={skip} disabled={saving || skipping}>
          {skipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salta per ora
        </Button>
      </div>
    </div>
  );
}
