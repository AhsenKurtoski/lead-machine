"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, AlertCircle } from "lucide-react";

export function ScreenshotCard({
  leadId,
  website,
  initialScreenshot,
}: {
  leadId: string;
  website: string | null;
  initialScreenshot: string | null;
}) {
  const [shot, setShot] = React.useState<string | null>(initialScreenshot);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function capture() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (data.ok) {
        setShot(data.screenshot + "?t=" + Date.now());
      } else {
        setError(data.error ?? "Errore durante la cattura.");
      }
    } catch {
      setError("Errore di rete durante la cattura.");
    }
    setLoading(false);
  }

  if (!website) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Anteprima del sito attuale del lead, utile per mostrargli com'e messo oggi.
        </p>
        <Button size="sm" variant="outline" onClick={capture} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-1 h-4 w-4" />
          )}
          {shot ? "Aggiorna" : "Cattura"}
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {shot ? (
        <a
          href={shot}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt="Screenshot del sito" className="w-full" />
        </a>
      ) : !error ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
          <Camera className="h-8 w-8" />
          <p className="text-sm">Nessuno screenshot ancora.</p>
        </div>
      ) : null}
    </div>
  );
}
