import * as React from "react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, formatDate, statusLabel } from "@/lib/utils";
import { variantFor, VARIANT_LABELS, type Variant } from "@/lib/ab";
import { PrintButton } from "@/components/print-button";
import { Users, MessageSquareText, PhoneCall, CalendarDays, Trophy, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

async function getReport() {
  const since = new Date(Date.now() - 7 * 86400000);

  const [newLeads, contactedActs, messages, calls, appts, newClients, byStatus, abMessages] =
    await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      prisma.activity.count({ where: { createdAt: { gte: since }, type: { in: ["whatsapp", "email", "chiamata"] } } }),
      prisma.generatedMessage.count({ where: { createdAt: { gte: since } } }),
      prisma.activity.count({ where: { createdAt: { gte: since }, type: "chiamata" } }),
      prisma.appointment.count({ where: { startsAt: { gte: since } } }),
      prisma.activity.count({ where: { createdAt: { gte: since }, type: "stato", description: { contains: "CLIENTE" } } }),
      prisma.lead.groupBy({ by: ["status"], _count: true }),
      prisma.generatedMessage.findMany({
        where: { channel: { in: ["whatsapp", "email"] } },
        select: { leadId: true, lead: { select: { status: true } } },
      }),
    ]);

  // A/B: variante derivata dall'id del lead. Conversione = lead in trattativa o cliente.
  const ab: Record<Variant, { sent: number; leads: Set<string>; won: Set<string> }> = {
    A: { sent: 0, leads: new Set(), won: new Set() },
    B: { sent: 0, leads: new Set(), won: new Set() },
  };
  for (const m of abMessages) {
    const v = variantFor(m.leadId);
    ab[v].sent += 1;
    ab[v].leads.add(m.leadId);
    const st = m.lead?.status;
    if (st === "IN_TRATTATIVA" || st === "CLIENTE") ab[v].won.add(m.leadId);
  }

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) statusMap[row.status] = row._count;

  return { since, newLeads, contactedActs, messages, calls, appts, newClients, statusMap, ab };
}

export default async function ReportPage() {
  const r = await getReport();

  const cards = [
    { label: "Nuovi lead", value: r.newLeads, icon: Users, accent: "text-blue-500" },
    { label: "Contatti inviati", value: r.contactedActs, icon: MessageSquareText, accent: "text-amber-500" },
    { label: "Messaggi generati", value: r.messages, icon: TrendingUp, accent: "text-rose-500" },
    { label: "Chiamate", value: r.calls, icon: PhoneCall, accent: "text-sky-500" },
    { label: "Appuntamenti", value: r.appts, icon: CalendarDays, accent: "text-indigo-500" },
    { label: "Nuovi clienti", value: r.newClients, icon: Trophy, accent: "text-emerald-500" },
  ];

  function abStats(v: Variant) {
    const data = r.ab[v];
    const leads = data.leads.size;
    const won = data.won.size;
    const rate = leads > 0 ? Math.round((won / leads) * 100) : 0;
    return { sent: data.sent, leads, won, rate };
  }
  const a = abStats("A");
  const b = abStats("B");
  const winner = a.rate === b.rate ? null : a.rate > b.rate ? "A" : "B";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report settimanale</h1>
          <p className="text-muted-foreground">
            Attivita dal {formatDate(r.since)} a oggi - zona Feltre / provincia di Belluno
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-3xl font-bold">{c.value}</p>
              </div>
              <div className={"rounded-xl bg-muted p-3 " + c.accent}>
                <c.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline attuale</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {Object.keys(STATUS_LABELS).map((s) => (
            <div key={s} className="rounded-lg border px-4 py-3">
              <p className="text-xs text-muted-foreground">{statusLabel(s)}</p>
              <p className="text-2xl font-bold">{r.statusMap[s] ?? 0}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>A/B test dei messaggi</CardTitle>
          {winner ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              In testa: {VARIANT_LABELS[winner as Variant]}
            </Badge>
          ) : (
            <Badge variant="secondary">Parita / dati insufficienti</Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Ogni lead riceve in automatico la Variante A o B del messaggio. Qui vedi quale converte
            di piu (lead diventati in trattativa o clienti).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["A", "B"] as Variant[]).map((v) => {
              const st = v === "A" ? a : b;
              return (
                <div key={v} className="rounded-lg border p-4">
                  <p className="font-semibold">{VARIANT_LABELS[v]}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-2xl font-bold">{st.sent}</p>
                      <p className="text-xs text-muted-foreground">Inviati</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st.leads}</p>
                      <p className="text-xs text-muted-foreground">Lead</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st.rate}%</p>
                      <p className="text-xs text-muted-foreground">Conversione</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
