import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { parseItems, computeTotals, computeRitenuta, formatEuro, BOLLO_THRESHOLD, BOLLO_AMOUNT, DICITURA_FUORI_CAMPO_IVA } from "@/lib/quotes";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function RicevutaPage({ params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { lead: true },
  });
  if (!quote) notFound();

  const settings = await getSettings();
  const items = parseItems(quote.items);
  // Niente IVA: regime di prestazione occasionale (senza partita IVA).
  const totals = computeTotals(items, quote.discount, 0);
  const r = computeRitenuta(totals.total, true);
  const lead = quote.lead;

  const holder = settings.brand_holder || settings.brand_owner || settings.brand_name || "________________";
  const operator = settings.brand_owner || "";
  const brandName = settings.brand_name || "";
  const brandLogo = settings.brand_logo || "/logo.png";
  const bolloNeeded = totals.total > BOLLO_THRESHOLD;
  const ricNumber = "RIC-" + quote.number.replace(/^PREV-/, "");
  const descr = quote.title || (items.length ? items.map((it) => it.description).join(", ") : "Servizi web");

  return (
    <div className="min-h-screen bg-zinc-100 py-8">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4">
        <Link href="/ricevuta" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" /> Torna alle ricevute
        </Link>
        <PrintButton />
      </div>

      <div className="print-sheet mx-auto max-w-[820px] bg-white shadow-lg">
        <div className="h-2 w-full rounded-t bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
        <div className="p-10">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              {brandLogo ? <img src={brandLogo} alt={brandName} className="mb-2 h-12 w-auto object-contain" /> : null}
              <div className="text-2xl font-bold text-emerald-700">{brandName}</div>
            </div>
            <div className="text-right">
              <div className="inline-block rounded-md bg-emerald-50 px-3 py-1 text-base font-semibold tracking-wide text-emerald-700">
                RICEVUTA
              </div>
              <div className="mt-2 text-sm text-zinc-600">N. {ricNumber}</div>
              <div className="text-sm text-zinc-600">Data: {formatDate(quote.createdAt)}</div>
            </div>
          </div>

          <h1 className="mt-6 text-lg font-bold text-zinc-800">Ricevuta per prestazione occasionale</h1>
          <p className="text-xs text-zinc-500">(Art. 67, comma 1, lett. l, DPR 917/86 - reddito diverso, attivita non abituale)</p>

          <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Prestatore (emittente)</div>
              <div className="font-semibold">{holder}</div>
              {operator && operator !== holder ? (
                <div className="text-zinc-600">Esecuzione materiale a cura di {operator}</div>
              ) : null}
              <div className="mt-1 text-xs text-zinc-400">Codice fiscale: ____________________</div>
              <div className="text-xs text-zinc-400">Indirizzo: ____________________</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Committente</div>
              <div className="font-semibold">{lead.name}</div>
              {lead.addressFull ? <div className="text-zinc-600">{lead.addressFull}</div> : null}
              {lead.email ? <div className="text-zinc-600">{lead.email}</div> : null}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-zinc-400">Descrizione della prestazione</div>
            <p className="text-sm text-zinc-700">{descr}</p>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Compenso lordo</span>
                <span className="font-medium">{formatEuro(r.gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Ritenuta d'acconto 20% *</span>
                <span className="font-medium">- {formatEuro(r.ritenuta)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Netto a pagare</span>
                <span className="text-emerald-700">{formatEuro(r.net)}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            * La ritenuta d'acconto del 20% si applica solo se il committente e un'azienda/professionista con partita IVA (sostituto d'imposta). Con un committente privato il netto da incassare coincide con il compenso lordo ({formatEuro(r.gross)}).
          </p>

          <div className="mt-6 rounded-md bg-zinc-50 p-4 text-xs text-zinc-600">
            <p className="font-medium text-zinc-700">{DICITURA_FUORI_CAMPO_IVA}.</p>
            <p className="mt-1">Prestazione occasionale, non esercizio di attivita abituale (art. 67, comma 1, lett. l, DPR 917/86).</p>
            {bolloNeeded ? (
              <p className="mt-1 font-medium text-zinc-700">Applicare marca da bollo da {formatEuro(BOLLO_AMOUNT)} sull'originale (importo superiore a {formatEuro(BOLLO_THRESHOLD)}).</p>
            ) : (
              <p className="mt-1">Marca da bollo non necessaria (importo non superiore a {formatEuro(BOLLO_THRESHOLD)}).</p>
            )}
          </div>

          <div className="mt-10 grid gap-8 text-sm sm:grid-cols-2">
            <div>
              <div className="mb-10 text-zinc-500">Luogo e data</div>
              <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-400">____________________</div>
            </div>
            <div>
              <div className="mb-10 text-zinc-500">Firma del prestatore</div>
              <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-400">{holder}</div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-zinc-400">
            Modello indicativo di ricevuta. Verifica i dati con un commercialista prima dell'emissione. Compila codice fiscale e indirizzo del prestatore (adulto intestatario).
          </div>
        </div>
      </div>
    </div>
  );
}
