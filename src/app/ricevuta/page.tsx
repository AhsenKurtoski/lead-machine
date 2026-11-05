import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, methodLabel } from "@/lib/receipts";
import type { LocaleCode } from "@/lib/i18n-config";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";
import { ReceiptForm } from "@/components/receipt-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ricevute di pagamento",
  description:
    "Registra e stampa la prova di pagamento ricevuta dalle attivita che hai contattato.",
  alternates: { canonical: "/ricevuta" },
};

export default async function RicevutaListPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const sp = await searchParams;
  let settings: Record<string, string> = {};
  let receipts: {
    id: string;
    number: string;
    amount: number;
    method: string;
    paidAt: Date;
    description: string | null;
    lead: { id: string; name: string } | null;
  }[] = [];
  let leads: { id: string; name: string }[] = [];
  let dbError = false;

  try {
    [receipts, leads, settings] = await Promise.all([
      prisma.receipt.findMany({
        orderBy: { paidAt: "desc" },
        include: { lead: { select: { id: true, name: true } } },
      }),
      prisma.lead.findMany({
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
        take: 500,
      }),
      getSettings(),
    ]);
  } catch {
    dbError = true;
  }

  const locale = (settings.locale as LocaleCode | undefined) || undefined;
  const currency = settings.currency || undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ricevute di pagamento</h1>
        <p className="text-muted-foreground">
          La prova che un&apos;attivita ti ha pagato: chi, quanto, come e quando. Nessun campo
          fiscale, solo il pagamento ricevuto.
        </p>
      </div>

      {dbError ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Database non raggiungibile. Avvia l&apos;app con <code>npm run setup</code> e ricarica.
          </CardContent>
        </Card>
      ) : (
        <>
          {leads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Non hai ancora nessuna attivita in archivio. Trova le attivita della tua zona in{" "}
                <Link href="/ricerca" className="underline">
                  Ricerca
                </Link>{" "}
                e poi torna qui a registrare il pagamento.
              </CardContent>
            </Card>
          ) : (
            <ReceiptForm leads={leads} defaultLeadId={sp.lead} />
          )}

          {receipts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nessuna ricevuta registrata.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {r.number} - {r.lead?.name ?? "(attivita rimossa)"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(r.amount, locale, currency)} - {methodLabel(r.method)} -{" "}
                        {formatDate(r.paidAt)}
                        {r.description ? " - " + r.description : ""}
                      </div>
                    </div>
                    <Link href={"/ricevuta/" + r.id} target="_blank">
                      <Button variant="outline" size="sm">
                        <Printer className="mr-1 h-4 w-4" /> Apri e stampa
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
