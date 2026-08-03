"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/followups";
import { cn } from "@/lib/utils";
import {
  StickyNote,
  ArrowRightLeft,
  MessageCircle,
  Mail,
  Phone,
  Cog,
  Activity as ActivityIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";

type ActivityItem = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  lead: { id: string; name: string } | null;
};

const TYPE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  nota: { label: "Nota", icon: StickyNote, color: "text-blue-600 bg-blue-500/10" },
  stato: { label: "Cambio stato", icon: ArrowRightLeft, color: "text-purple-600 bg-purple-500/10" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-emerald-600 bg-emerald-500/10" },
  email: { label: "Email", icon: Mail, color: "text-amber-600 bg-amber-500/10" },
  chiamata: { label: "Chiamata", icon: Phone, color: "text-sky-600 bg-sky-500/10" },
  sistema: { label: "Sistema", icon: Cog, color: "text-zinc-500 bg-zinc-500/10" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tutte" },
  { value: "nota", label: "Note" },
  { value: "stato", label: "Stati" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "chiamata", label: "Chiamate" },
  { value: "sistema", label: "Sistema" },
];

export default function AttivitaPage() {
  const [items, setItems] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    const url = filter ? "/api/activities?type=" + filter : "/api/activities";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.activities ?? []);
        setLoading(false);
      });
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log attivita</h1>
        <p className="text-muted-foreground">
          Cronologia completa di tutto cio che e successo sui tuoi lead.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              filter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ActivityIcon className="h-8 w-8" />
              <p className="text-sm">Nessuna attivita da mostrare.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((a) => {
                const meta = TYPE_META[a.type] ?? TYPE_META.sistema;
                const Icon = meta.icon;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        meta.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{a.description}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{meta.label}</span>
                        <span>-</span>
                        <span>{formatDateTime(a.createdAt)}</span>
                        {a.lead ? (
                          <>
                            <span>-</span>
                            <Link
                              href={"/crm/" + a.lead.id}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {a.lead.name}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
