import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { parseItems, computeTotals, computeDeposit, formatEuro, QUOTE_TERMS, quoteValidityState, computeFiscalSummary, DICITURA_FUORI_CAMPO_IVA, BOLLO_THRESHOLD } from "@/lib/quotes";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";
import { QuoteSendActions } from "@/components/quote-send-actions";

export const dynamic = "force-dynamic";

export default async function PreventivoPage({ params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { lead: true },
  });
  if (!quote) notFound();

  const settings = await getSettings();
  const items = parseItems(quote.items);
  // Niente IVA: opero in regime di prestazione occasionale (senza partita IVA).
  const totals = computeTotals(items, quote.discount, 0);
  const deposit = computeDeposit(totals.total, quote.depositPercent || 0);
  const fiscal = computeFiscalSummary(totals.total);
  const lead = quote.lead;

  const brandName = settings.brand_name || "La tua Web Agency";
  const brandOwner = settings.brand_owner || "";
  const brandHolder = settings.brand_holder || "";
  const brandPhone = settings.brand_phone || "";
  const brandEmail = settings.brand_email || "";
  const brandLogo = settings.brand_logo || "/logo.png";
  const brandTagline = settings.brand_tagline || "Premium Digital Agency";

  const noVat = !(totals.taxRate > 0);

  const validity = quoteValidityState(quote.validUntil);
  const isExpired = validity.state === "expired";
  const stampText =
    quote.status === "accettato"
      ? "ACCETTATO"
      : quote.status === "rifiutato"
      ? "RIFIUTATO"
      : isExpired
      ? "SCADUTO"
      : quote.status === "inviato"
      ? "INVIATO"
      : "BOZZA";
  const stampColor =
    quote.status === "accettato"
      ? "border-emerald-500 text-emerald-600"
      : quote.status === "rifiutato" || isExpired
      ? "border-red-400 text-red-500"
      : quote.status === "inviato"
      ? "border-blue-400 text-blue-500"
      : "border-zinc-300 text-zinc-400";

  const itemsText = items
    .map((it) => "- " + it.description + " x" + it.qty + ": " + formatEuro(it.qty * it.price))
    .join("\n");
  const totalLine =
    "Totale: " +
    formatEuro(totals.total) +
    (totals.taxRate > 0
      ? " (IVA " + totals.taxRate + "% inclusa)."
      : " (prestazione occasionale, non soggetta a IVA).");
  const depositLine =
    deposit.percent > 0
      ? "Acconto " + deposit.percent + "%: " + formatEuro(deposit.deposit) + " - Saldo: " + formatEuro(deposit.balance) + "."
      : "";
  const payLine = quote.paymentTerms ? "Pagamento: " + quote.paymentTerms + "." : "";
  const deliveryLine = quote.deliveryTime ? "Tempi di consegna: " + quote.deliveryTime + "." : "";
  const validLine = quote.validUntil ? "Valido fino al: " + formatDate(quote.validUntil) + "." : "";
  const emailSubject = "Preventivo " + quote.number + (quote.title ? " - " + quote.title : "");
  const emailBody = [
    "Gentile " + lead.name + ",",
    "le invio il preventivo " + quote.number + (quote.title ? " (" + quote.title + ")" : "") + ":",
    itemsText,
    totalLine,
    depositLine,
    payLine,
    deliveryLine,
    validLine,
    "Resto a disposizione per qualsiasi chiarimento.",
    "Cordiali saluti,",
    brandOwner || brandName,
    brandName + (brandPhone ? " - Tel: " + brandPhone : ""),
  ]
    .filter((l) => l !== "")
    .join("\n");
  const waBody = [
    "Ciao " + lead.name + ", ecco il preventivo " + quote.number + ":",
    itemsText,
    totalLine,
    depositLine,
    validLine,
    brandOwner || brandName,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return (
    <div className="min-h-screen bg-zinc-100 py-8">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4">
        <Link href="/preventivi" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" /> Torna ai preventivi
        </Link>
        <div className="flex flex-col items-end gap-3">
          <QuoteSendActions
            quoteId={quote.id}
            email={lead.email}
            whatsapp={lead.whatsapp || lead.mobile || lead.phone}
            emailSubject={emailSubject}
            emailBody={emailBody}
            waBody={waBody}
            initialStatus={quote.status}
          />
          <PrintButton />
        </div>
      </div>

      <div className="print-sheet mx-auto max-w-[820px] bg-white shadow-lg">
        {/* Banda superiore premium */}
        <div className="h-2 w-full rounded-t bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500" />
        <div className="p-10">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              {brandLogo ? (
                <img src={brandLogo} alt={brandName} className="mb-2 h-12 w-auto object-contain" />
              ) : null}
              <div className="text-2xl font-bold text-indigo-600">{brandName}</div>
              {brandTagline ? (
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">{brandTagline}</div>
              ) : null}
              {brandOwner ? <div className="mt-1 text-sm text-zinc-600">Referente: {brandOwner}</div> : null}
              {brandHolder ? <div className="text-sm text-zinc-600">Intestatario: {brandHolder}</div> : null}
              {brandPhone ? <div className="text-sm text-zinc-600">Tel: {brandPhone}</div> : null}
              {brandEmail ? <div className="text-sm text-zinc-600">{brandEmail}</div> : null}
            </div>
            <div className="text-right">
              <div className="inline-block rounded-md bg-indigo-50 px-3 py-1 text-lg font-semibold tracking-wide text-indigo-700">
                PREVENTIVO
              </div>
              <div className="mt-2 text-sm text-zinc-600">N. {quote.number}</div>
              <div className="text-sm text-zinc-600">Data: {formatDate(quote.createdAt)}</div>
              {quote.validUntil ? (
                <div className="text-sm text-zinc-600">Valido fino al: {formatDate(quote.validUntil)}</div>
              ) : null}
              <div className={"mt-3 inline-block -rotate-6 rounded border-2 px-3 py-1 text-sm font-extrabold uppercase tracking-widest " + stampColor}>
                {stampText}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-zinc-400">Spett.le</div>
            <div className="text-lg font-semibold">{lead.name}</div>
            {lead.addressFull ? <div className="text-sm text-zinc-600">{lead.addressFull}</div> : null}
            {lead.email || lead.phone || lead.mobile ? (
              <div className="text-sm text-zinc-600">{lead.email || lead.phone || lead.mobile}</div>
            ) : null}
          </div>

          {quote.title ? <h2 className="mt-6 text-xl font-bold">{quote.title}</h2> : null}

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-zinc-500">
                <th className="py-2 pl-2">Descrizione</th>
                <th className="py-2 text-center">Qta</th>
                <th className="py-2 text-right">Prezzo</th>
                <th className="py-2 pr-2 text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pl-2 pr-2">{it.description}</td>
                  <td className="py-2 text-center">{it.qty}</td>
                  <td className="py-2 text-right">{formatEuro(it.price)}</td>
                  <td className="py-2 pr-2 text-right">{formatEuro(it.qty * it.price)}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-zinc-400">Nessuna voce</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Subtotale</span>
                <span>{formatEuro(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Sconto</span>
                  <span>- {formatEuro(totals.discount)}</span>
                </div>
              ) : null}
              {totals.taxRate > 0 ? (
                <div className="flex justify-between">
                  <span className="text-zinc-600">IVA {totals.taxRate}%</span>
                  <span>{formatEuro(totals.taxAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Totale</span>
                <span className="text-indigo-600">{formatEuro(totals.total)}</span>
              </div>
              {deposit.percent > 0 ? (
                <div className="mt-2 space-y-1 rounded-md bg-indigo-50 p-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Acconto ({deposit.percent}%)</span>
                    <span className="font-semibold">{formatEuro(deposit.deposit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Saldo alla consegna</span>
                    <span className="font-semibold">{formatEuro(deposit.balance)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Riepilogo fiscale (prestazione occasionale, senza partita IVA) */}
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            <div className="font-semibold">Note fiscali</div>
            <p className="mt-1">{DICITURA_FUORI_CAMPO_IVA}.</p>
            <p className="mt-1">
              Importi al netto di IVA (non applicata). Se il committente è un'azienda o un professionista con partita IVA,
              {" "}si applica la ritenuta d'acconto del 20% pari a {formatEuro(fiscal.ritenuta)}; il netto a corrispondere sarà {formatEuro(fiscal.netAfterRitenuta)}
              {fiscal.bolloNeeded ? " (oltre marca da bollo da " + formatEuro(fiscal.bollo) + ")" : ""}.
            </p>
            {fiscal.bolloNeeded ? (
              <p className="mt-1 font-medium">
                Importo superiore a {formatEuro(BOLLO_THRESHOLD)}: sulla ricevuta va applicata una marca da bollo da {formatEuro(fiscal.bollo)}.
              </p>
            ) : null}
          </div>

          {/* Condizioni */}
          <div className="mt-8 grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
            {quote.paymentTerms ? (
              <div>
                <div className="mb-1 font-semibold text-zinc-700">Condizioni di pagamento</div>
                <p className="whitespace-pre-wrap text-zinc-600">{quote.paymentTerms}</p>
              </div>
            ) : null}
            {quote.deliveryTime ? (
              <div>
                <div className="mb-1 font-semibold text-zinc-700">Tempi di consegna</div>
                <p className="text-zinc-600">{quote.deliveryTime}</p>
              </div>
            ) : null}
          </div>

          {quote.notes ? (
            <div className="mt-6 border-t pt-4 text-sm text-zinc-600">
              <div className="mb-1 font-semibold text-zinc-700">Note</div>
              <p className="whitespace-pre-wrap">{quote.notes}</p>
            </div>
          ) : null}

          {/* Condizioni generali */}
          <div className="mt-8 border-t pt-6">
            <div className="mb-2 text-sm font-semibold text-zinc-700">Condizioni generali</div>
            <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-zinc-500">
              {QUOTE_TERMS.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>

          {/* Accettazione / firma */}
          <div className="mt-8 grid gap-8 border-t pt-8 text-sm sm:grid-cols-2">
            <div>
              <div className="mb-10 text-zinc-500">Per accettazione (il cliente)</div>
              <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-400">Data e firma</div>
            </div>
            <div>
              <div className="mb-10 text-zinc-500">{brandName}</div>
              <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-400">
                {brandHolder || brandOwner || brandName}
              </div>
            </div>
          </div>

          <div className="mt-10 text-center text-xs text-zinc-400">
            Preventivo generato con {brandName}.{" "}
            {DICITURA_FUORI_CAMPO_IVA + ". Importi al netto di IVA; eventuale ritenuta d'acconto del 20% se il committente \u00e8 sostituto d'imposta."}
          </div>
        </div>
      </div>
    </div>
  );
}
