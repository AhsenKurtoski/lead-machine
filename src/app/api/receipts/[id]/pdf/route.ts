import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { rateLimitedResponse } from "@/lib/security";
import { buildReceiptPdf, receiptPdfFilename } from "@/lib/receipt-pdf";
import type { LocaleCode } from "@/lib/i18n-config";

export const dynamic = "force-dynamic";

// Scarica la ricevuta in PDF. Stessi dati della pagina stampabile, generati
// lato server: niente browser headless, quindi funziona anche su Workers.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await rateLimitedResponse(req, "receipt:pdf", 30, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { lead: true },
  });
  if (!receipt) {
    return NextResponse.json({ ok: false, error: "Ricevuta non trovata" }, { status: 404 });
  }

  const settings = await getSettings();
  const pdf = await buildReceiptPdf({
    number: receipt.number,
    paidAt: receipt.paidAt,
    amount: receipt.amount,
    method: receipt.method,
    description: receipt.description || "Prestazione professionale - pagamento ricevuto",
    notes: receipt.notes,
    leadName: receipt.lead.name,
    brandName: settings.brand_name,
    issuer: settings.brand_owner || settings.brand_name,
    locale: (settings.locale as LocaleCode | undefined) || undefined,
    currency: settings.currency,
  });

  // Copia in un Uint8Array con buffer proprio: il tipo restituito da
  // pdf-lib (`ArrayBufferLike`) non è direttamente un BodyInit valido.
  const body = Uint8Array.from(pdf);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receiptPdfFilename(receipt.number)}"`,
      // Dati del cliente: non deve finire in cache condivise.
      "Cache-Control": "no-store",
    },
  });
}
