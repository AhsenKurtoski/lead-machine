"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, RefreshCw } from "lucide-react";

const WS_LABELS: Record<string, string> = {
  assente: "Nessun sito",
  ok: "Sito ok",
  lento: "Sito lento",
  vecchio: "Sito datato",
  non_responsive: "Non raggiungibile",
  da_verificare: "Da verificare",
};

const WS_COLORS: Record<string, string> = {
  assente: "bg-zinc-500/15 text-zinc-500",
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  lento: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  vecchio: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  non_responsive: "bg-red-500/15 text-red-600 dark:text-red-400",
  da_verificare: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

export function WebsiteCheckCard({
  leadId,
  website,
  initialStatus,
}: {
  leadId: string;
  website: string | null;
  initialStatus: string | null;
}) {
  const [status, setStatus] = React.useState<string | null>(initialStatus);
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<string | null>(null);

  async function verify() {
    setLoading(true);
    setDetail(null);
    try {
      const res = await fetch("/api/leads/" + leadId + "/enrich", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setStatus(data.websiteStatus);
        setDetail(data.check?.detail ?? null);
      } else {
        setDetail(data.error ?? "Errore durante la verifica.");
      }
    } catch {
      setDetail("Errore di rete durante la verifica.");
    }
    setLoading(false);
  }

  const key = status ?? "da_verificare";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Badge className={WS_COLORS[key] ?? WS_COLORS.da_verificare}>
          {WS_LABELS[key] ?? key}
        </Badge>
        <Button size="sm" variant="outline" onClick={verify} disabled={!website || loading}>
          {loading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Verifica sito
        </Button>
      </div>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
