import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatCurrency, methodLabel } from "@/lib/receipts";
import type { LocaleCode } from "@/lib/i18n-config";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ricevuta di pagamento",
  robots: { index: false, follow: false },
};

// Ricevuta di pagamento: attesta che il cliente ha pagato.
// Non e un documento fiscale: non contiene aliquote, partita IVA o sconti.
export default async function RicevutaPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: { lead: true },
  });
  if (!receipt) notFound();

  const settings = await getSettings();
  const lead = receipt.lead;

  const locale = (settings.locale as LocaleCode | undefined) || undefined;
  const currency = settings.currency || undefined;
  const issuer = settings.brand_owner || settings.brand_name || "";
  const brandName = settings.brand_name || "";
  const brandLogo = settings.brand_logo || "/logo.png";
  const description =
    receipt.description || "Prestazione professionale - pagamento ricevuto";

  return (
    <div className="min-h-screen bg-zinc-100 py-8">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4">
        <Link
          href="/ricevuta"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> Torna alle ricevute
        </Link>
        <PrintButton />
      </div>

      <div className="print-sheet mx-auto max-w-[820px] bg-white shadow-lg">
        <div className="h-2 w-full rounded-t bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
        <div className="p-10">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName || "Logo"}
                  className="mb-2 h-12 w-auto object-contain"
                />
              ) : null}
              {brandName ? <div className="text-2xl font-bold text-emerald-700">{brandName}</div> : null}
              {issuer && issuer !== brandName ? (
                <div className="text-sm text-zinc-600">{issuer}</div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="inline-block rounded-md bg-emerald-50 px-3 py-1 text-base font-semibold tracking-wide text-emerald-700">
                RICEVUTA
              </div>
              <div className="mt-2 text-sm text-zinc-600">N. {receipt.number}</div>
              <div className="text-sm text-zinc-600">Data: {formatDate(receipt.paidAt)}</div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border-2 border-emerald-600 px-3 py-1 text-sm font-bold uppercase tracking-wide text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Pagato
            </span>
            <h1 className="text-lg font-bold text-zinc-800">Ricevuta di pagamento</h1>
          </div>

          <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Ricevuto da</div>
              <div className="font-semibold">{brandName || issuer || "________________"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Pagato da</div>
              <div className="font-semibold">{lead.name}</div>
              {lead.addressFull ? <div className="text-zinc-600">{lead.addressFull}</div> : null}
              {lead.email ? <div className="text-zinc-600">{lead.email}</div> : null}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-zinc-400">Descrizione</div>
            <p className="text-sm text-zinc-700">{description}</p>
          </div>

          <div className="mt-6 grid gap-4 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Importo pagato</div>
              <div className="text-xl font-bold text-emerald-700">
                {formatCurrency(receipt.amount, locale, currency)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Metodo</div>
              <div className="font-semibold">{methodLabel(receipt.method)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Data pagamento</div>
              <div className="font-semibold">{formatDate(receipt.paidAt)}</div>
            </div>
          </div>

          {receipt.notes ? (
            <div className="mt-6 text-sm">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Note</div>
              <p className="text-zinc-700">{receipt.notes}</p>
            </div>
          ) : null}

          <div className="mt-10 grid gap-8 text-sm sm:grid-cols-2">
            <div>
              <div className="mb-10 text-zinc-500">Luogo e data</div>
              <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-400">
                ____________________
              </div>
            </div>
            <div>
              <div className="mb-10 text-zinc-500">Firma di chi ha ricevuto il pagamento</div>
              <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-400">
                {issuer || brandName || "____________________"}
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-zinc-400">
            Documento generato da Lead Machine che attesta il pagamento ricevuto. Non e un
            documento fiscale e non sostituisce i documenti previsti dalla legge.
          </div>
        </div>
      </div>
    </div>
  );
}
