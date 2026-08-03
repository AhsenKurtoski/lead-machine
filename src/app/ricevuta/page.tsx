import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { quoteTotalFromRaw, formatEuro } from "@/lib/quotes";
import { formatDate } from "@/lib/utils";
import { Receipt, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RicevutaListPage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: { select: { name: true } } },
  });
  const accepted = quotes.filter((q) => q.status === "accettato");
  const others = quotes.filter((q) => q.status !== "accettato");

  function row(q: (typeof quotes)[number], highlight: boolean) {
    const total = quoteTotalFromRaw(q.items, q.discount, q.taxRate);
    return (
      <Card key={q.id}>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {q.number} - {q.lead?.name ?? "(lead rimosso)"}
            </div>
            <div className="text-sm text-muted-foreground">
              {q.title || "Senza titolo"} - {formatEuro(total)} - {formatDate(q.createdAt)}
            </div>
          </div>
          {highlight ? (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Accettato
            </Badge>
          ) : null}
          <Link href={"/ricevuta/" + q.id} target="_blank">
            <Button variant="outline" size="sm">
              <Receipt className="mr-1 h-4 w-4" /> Genera ricevuta
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ricevute</h1>
        <p className="text-muted-foreground">
          Genera una ricevuta per prestazione occasionale da un preventivo. Da emettere a nome dell'adulto intestatario.
        </p>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nessun preventivo disponibile. Crea prima un preventivo, poi potrai generare la ricevuta.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Preventivi accettati (consigliati)</h2>
            {accepted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun preventivo ancora accettato.</p>
            ) : (
              <div className="space-y-2">{accepted.map((q) => row(q, true))}</div>
            )}
          </div>
          {others.length > 0 ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Altri preventivi</h2>
              <div className="space-y-2">{others.map((q) => row(q, false))}</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
