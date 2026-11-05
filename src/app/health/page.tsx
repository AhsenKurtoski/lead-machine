import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Info,
  Plug,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runHealthChecks, type HealthStatus } from "@/lib/health";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stato del sistema",
  description: "Diagnostica locale di Lead Machine: progetto, database, sicurezza e integrazioni.",
  alternates: { canonical: "/health" },
  robots: { index: false, follow: false },
};

const STATUS_META: Record<
  HealthStatus,
  {
    label: string;
    className: string;
    Icon: LucideIcon;
  }
> = {
  ok: {
    label: "Funziona",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  warn: {
    label: "Attenzione",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  fail: {
    label: "Non funziona",
    className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    Icon: XCircle,
  },
  info: {
    label: "Info",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Icon: Info,
  },
};

const OVERALL_META = {
  ok: {
    title: "Tutto operativo",
    detail: "Tutti i controlli obbligatori sono passati. Gli eventuali avvisi sono funzioni opzionali.",
    className: "border-emerald-500/40 bg-emerald-500/5",
  },
  warn: {
    title: "Funziona, con avvisi",
    detail: "Le funzioni principali sono disponibili, ma c'è qualcosa da sistemare o da configurare.",
    className: "border-amber-500/40 bg-amber-500/5",
  },
  fail: {
    title: "Ci sono problemi da correggere",
    detail: "Almeno un controllo obbligatorio è fallito. Leggi i dettagli nella sezione Non funziona.",
    className: "border-red-500/40 bg-red-500/5",
  },
} as const;

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatCheckedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function HealthPage() {
  const report = await runHealthChecks();
  const overall = OVERALL_META[report.overall];

  const summaryCards = [
    { label: "Funzionano", value: report.summary.ok, status: "ok" as const },
    { label: "Avvisi", value: report.summary.warn, status: "warn" as const },
    { label: "Non funzionano", value: report.summary.fail, status: "fail" as const },
    { label: "Informazioni", value: report.summary.info, status: "info" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ShieldCheck className="h-7 w-7 text-emerald-500" aria-hidden="true" />
            Stato del sistema
          </h1>
          <p className="mt-1 text-muted-foreground">
            Scansione locale di progetto, database, sicurezza e integrazioni. Nessun segreto viene mostrato.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <span className="text-xs text-muted-foreground">
            Controllato il {formatCheckedAt(report.checkedAt)}
          </span>
          <Link
            href="/health"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Riesegui i controlli
          </Link>
        </div>
      </div>

      <Card className={overall.className}>
        <CardContent className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">{overall.title}</p>
            <p className="text-sm text-muted-foreground">{overall.detail}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-sm", STATUS_META[report.overall].className)}
          >
            {countLabel(report.summary.fail, "errore", "errori")} ·{" "}
            {countLabel(report.summary.warn, "avviso", "avvisi")}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const meta = STATUS_META[card.status];
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold">{card.value}</p>
                </div>
                <div className={cn("rounded-xl border p-3", meta.className)}>
                  <meta.Icon className="h-5 w-5" aria-hidden={true} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {report.sections.map((section) => {
        const SectionIcon =
          section.id === "database"
            ? Database
            : section.id === "security"
              ? ShieldCheck
              : section.id === "integrations"
                ? Plug
                : Server;
        const sectionFails = section.checks.filter((item) => item.status === "fail").length;
        const sectionWarns = section.checks.filter((item) => item.status === "warn").length;

        return (
          <Card key={section.id}>
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <SectionIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  {section.title}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {countLabel(section.checks.length, "controllo", "controlli")}
                  {sectionFails > 0
                    ? ` · ${countLabel(sectionFails, "errore", "errori")}`
                    : ""}
                  {sectionWarns > 0
                    ? ` · ${countLabel(sectionWarns, "avviso", "avvisi")}`
                    : ""}
                </span>
              </div>
              {section.description ? (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.checks.map((item) => {
                  const meta = STATUS_META[item.status];
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <meta.Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                          {item.hint ? (
                            <p className="mt-1 text-xs text-muted-foreground/80">{item.hint}</p>
                          ) : null}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("w-fit shrink-0 text-[11px]", meta.className)}
                      >
                        {meta.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Questa pagina controlla configurazione, database e integrazioni locali. Non esegue test di
        rete verso servizi esterni e non modifica dati. Per la suite completa usa{" "}
        <code className="rounded bg-muted px-1">npm test</code> e{" "}
        <code className="rounded bg-muted px-1">npm run check:auth</code>.
      </p>
    </div>
  );
}
