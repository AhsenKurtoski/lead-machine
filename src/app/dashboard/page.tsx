import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { needsOnboarding } from "@/lib/onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS, priorityColor, cn, statusLabel } from "@/lib/utils";
import { Users, Search, MessageSquareText, Trophy, Globe, Receipt, ArrowRight } from "lucide-react";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { DonutChart } from "@/components/dashboard/mini-charts";

export const metadata = {
  title: "Dashboard",
  alternates: { canonical: "/dashboard" },
};
export const dynamic = "force-dynamic";

async function getStats() {
  // Conteggi reali dal DB. Se il DB e vuoto, tutto a 0 (nessun errore).
  const [total, byStatus, contacted, clients, topLeads, byCategory, withWebsite, receipts] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({ by: ["status"], _count: true }),
      prisma.lead.count({ where: { status: { in: ["CONTATTATO", "IN_TRATTATIVA", "CLIENTE"] } } }),
      prisma.lead.count({ where: { status: "CLIENTE" } }),
      prisma.lead.findMany({ orderBy: { priorityScore: "desc" }, take: 5 }),
      prisma.lead.groupBy({ by: ["category"], _count: true }),
      prisma.lead.count({ where: { hasWebsite: true } }),
      prisma.receipt.count(),
    ]);

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) statusMap[row.status] = row._count;
  const responseRate = contacted > 0 ? Math.round((clients / contacted) * 100) : 0;

  // Il numero che conta davvero: quante attivita NON hanno un sito.
  const noWebsite = Math.max(0, total - withWebsite);

  // Distribuzione per categoria (prime 6 per numero di lead).
  const categoryData = byCategory
    .map((row) => ({ name: row.category ?? "Senza categoria", value: row._count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Presenza online: quanti lead hanno gia un sito e quanti no.
  const websiteData = [
    { name: "Con sito", value: withWebsite },
    { name: "Senza sito", value: noWebsite },
  ];

  return { total, statusMap, contacted, clients, responseRate, topLeads, categoryData, websiteData, noWebsite, receipts };
}

export default async function DashboardPage() {
  const { total, statusMap, contacted, clients, responseRate, topLeads, noWebsite, receipts, categoryData, websiteData } =
    await getStats();

  // Se l'utente non ha ancora scelto citta e brand, glielo ricordiamo qui
  // (senza bloccare la navigazione: puo sempre rimandare).
  const settings = await getSettings();
  const needsSetup = needsOnboarding(settings);

  const cards = [
    { label: "Attivita trovate", value: total, icon: Search, accent: "text-blue-500" },
    { label: "Contattate", value: contacted, icon: MessageSquareText, accent: "text-amber-500" },
    { label: "Clienti acquisiti", value: clients, icon: Trophy, accent: "text-emerald-500" },
    { label: "Tasso conversione", value: `${responseRate}%`, icon: Users, accent: "text-purple-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Panoramica della tua pipeline di attivita locali.</p>
      </div>

      {needsSetup ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">Completa la configurazione iniziale</p>
              <p className="text-xs text-muted-foreground">
                Imposta la tua attivita e la citta in cui cerchi i clienti: ricerche e messaggi
                useranno i tuoi dati invece di valori di esempio.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              Apri la configurazione <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Card statistiche */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold mt-1">{c.value}</p>
              </div>
              <div className={cn("rounded-xl bg-muted p-3", c.accent)}>
                <c.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Il cuore del prodotto: chi non ha un sito */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-emerald-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Attivita senza sito web
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{noWebsite}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sono le tue opportunita principali: nessun sito significa che il lavoro da fare c&apos;e.
            </p>
            <Link
              href="/opportunita"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
            >
              Apri la coda delle opportunita <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Ricevute di pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{receipts}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pagamenti ricevuti dalle attivita che hai gia chiuso.
            </p>
            <Link
              href="/ricevuta"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              Registra un pagamento <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel / pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline per stato</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart
              data={Object.keys(STATUS_LABELS).map((s) => ({
                name: statusLabel(s),
                value: statusMap[s] ?? 0,
              }))}
            />
          </CardContent>
        </Card>

        {/* Top lead per priorita */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 per priorita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLeads.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nessuna attivita ancora. Apri{" "}
                <Link href="/ricerca" className="underline">
                  Ricerca
                </Link>{" "}
                per trovarne nella tua zona.
              </p>
            )}
            {topLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.category ?? "-"}
                    {lead.city ? " - " + lead.city : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={STATUS_COLORS[lead.status]} variant="outline">
                    {statusLabel(lead.status)}
                  </Badge>
                  <span className={cn("font-bold tabular-nums", priorityColor(lead.priorityScore))}>
                    {lead.priorityScore}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Grafici: categorie e presenza online */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attivita per categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={categoryData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Presenza online</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={websiteData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
