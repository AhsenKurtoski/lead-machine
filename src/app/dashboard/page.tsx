import * as React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_COLORS, priorityColor, cn, statusLabel } from "@/lib/utils";
import { quoteTotalFromRaw, formatEuro, OCCASIONAL_THRESHOLD } from "@/lib/quotes";
import { Users, Search, MessageSquareText, Trophy, Receipt } from "lucide-react";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { DonutChart } from "@/components/dashboard/mini-charts";

export const dynamic = "force-dynamic";

async function getStats() {
  // Conteggi reali dal DB. Se il DB e vuoto, tutto a 0 (nessun errore).
  const [total, byStatus, contacted, clients, topLeads, acceptedQuotes, byCategory, withWebsite] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.count({ where: { status: { in: ["CONTATTATO", "IN_TRATTATIVA", "CLIENTE"] } } }),
    prisma.lead.count({ where: { status: "CLIENTE" } }),
    prisma.lead.findMany({ orderBy: { priorityScore: "desc" }, take: 5 }),
    prisma.quote.findMany({ where: { status: "accettato" } }),
    prisma.lead.groupBy({ by: ["category"], _count: true }),
    prisma.lead.count({ where: { hasWebsite: true } }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) statusMap[row.status] = row._count;
  const responseRate = contacted > 0 ? Math.round((clients / contacted) * 100) : 0;

  const year = new Date().getFullYear();
  const revenue = acceptedQuotes
    .filter((q) => new Date(q.createdAt).getFullYear() === year)
    .reduce((s, q) => s + quoteTotalFromRaw(q.items, q.discount, q.taxRate), 0);

  // Distribuzione per categoria (prime 6 per numero di lead).
  const categoryData = byCategory
    .map((row) => ({ name: row.category ?? "Senza categoria", value: row._count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Presenza online: quanti lead hanno gia un sito e quanti no.
  const websiteData = [
    { name: "Con sito", value: withWebsite },
    { name: "Senza sito", value: Math.max(0, total - withWebsite) },
  ];

  return { total, statusMap, contacted, clients, responseRate, topLeads, revenue, categoryData, websiteData };
}

export default async function DashboardPage() {
  const { total, statusMap, contacted, clients, responseRate, topLeads, revenue, categoryData, websiteData } = await getStats();

  const pct = Math.min(100, Math.round((revenue / OCCASIONAL_THRESHOLD) * 100));
  const fiscalBarStyle: React.CSSProperties = { width: pct + "%" };
  const fiscalColor =
    revenue >= OCCASIONAL_THRESHOLD
      ? "bg-red-500"
      : revenue >= OCCASIONAL_THRESHOLD * 0.8
      ? "bg-amber-500"
      : "bg-emerald-500";

  const cards = [
    { label: "Lead totali", value: total, icon: Search, accent: "text-blue-500" },
    { label: "Contattati", value: contacted, icon: MessageSquareText, accent: "text-amber-500" },
    { label: "Clienti acquisiti", value: clients, icon: Trophy, accent: "text-emerald-500" },
    { label: "Tasso conversione", value: `${responseRate}%`, icon: Users, accent: "text-purple-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Panoramica della tua pipeline lead - zona Feltre (BL)</p>
      </div>

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

      {/* Centro fiscale */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Centro fiscale - soglia {new Date().getFullYear()}</CardTitle>
          <Link href="/fisco">
            <Button variant="outline" size="sm">
              <Receipt className="mr-1 h-4 w-4" /> Apri
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {formatEuro(revenue)} di {formatEuro(OCCASIONAL_THRESHOLD)}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className={"h-full rounded-full " + fiscalColor} style={fiscalBarStyle} />
          </div>
          <p className="text-xs text-muted-foreground">
            Guadagno da preventivi accettati quest'anno (prestazione occasionale, soglia INPS 5.000 EUR).
          </p>
        </CardContent>
      </Card>

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
            <CardTitle>Top 5 lead per priorita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLeads.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nessun lead ancora. Vai su "Ricerca lead" per trovarne (Modulo 2).
              </p>
            )}
            {topLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.category ?? "-"} - {lead.city ?? "Feltre"}
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
            <CardTitle>Lead per categoria</CardTitle>
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
