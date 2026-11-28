// ============================================================
// Ricevuta di pagamento in PDF.
//
// La pagina /ricevuta/[id] e' stampabile dal browser, ma un PDF scaricabile
// serve per archiviarlo o allegarlo. Generato qui, lato server, con pdf-lib
// (JavaScript puro, compatibile con Cloudflare Workers): niente browser
// headless e niente servizio esterno.
//
// Non e' un documento fiscale: niente IVA, partita IVA, sconti o acconti.
// Il testo lo dice esplicitamente in fondo alla pagina.
// ============================================================
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { LocaleCode } from "@/lib/i18n-config";
import { formatCurrency, methodLabel } from "@/lib/receipts";
import { formatDate } from "@/lib/utils";

export type ReceiptPdfInput = {
  number: string;
  paidAt: Date | string;
  amount: number;
  method: string;
  description: string;
  notes?: string | null;
  leadName: string;
  brandName?: string | null;
  issuer?: string | null;
  locale?: LocaleCode | null;
  currency?: string | null;
};

// I font standard usano la codifica WinAnsi: alcuni caratteri tipografici
// (trattini lunghi, virgolette curve, emoji) la farebbero fallire. Si
// convertono i casi comuni e si sostituisce il resto, invece di far fallire
// l'intera ricevuta per una descrizione incollata da un'altra app.
const REPLACEMENTS: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
  "\u00A0": " ",
};

export function pdfSafeText(raw: string | null | undefined): string {
  const text = (raw ?? "").replace(/[\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u00A0]/g, (ch) => REPLACEMENTS[ch] ?? " ");
  return Array.from(text)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code <= 0xff || ch === "\u20AC" ? ch : "?";
    })
    .join("");
}

export function receiptPdfFilename(number: string): string {
  // Un solo segmento di percorso: niente slash, niente sequenze ".." o "--".
  const safe = number
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/[.-]{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `ricevuta-${safe || "senza-numero"}.pdf`;
}

export async function buildReceiptPdf(input: ReceiptPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Ricevuta ${input.number}`);
  doc.setSubject("Ricevuta di pagamento");
  doc.setCreator("Lead Machine");
  doc.setProducer("Lead Machine");
  doc.setCreationDate(new Date(input.paidAt));

  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const dark = rgb(0.12, 0.12, 0.14);
  const muted = rgb(0.42, 0.42, 0.46);
  const accent = rgb(0.02, 0.47, 0.34);
  const line = rgb(0.85, 0.85, 0.87);
  const left = 56;
  const right = 595.28 - 56;
  let y = 780;

  const text = (value: string, x: number, size: number, useBold = false, color = dark) => {
    page.drawText(pdfSafeText(value), { x, y, size, font: useBold ? bold : font, color });
  };

  // Intestazione: emittente a sinistra, numero e data a destra.
  const brand = input.brandName?.trim() || "Ricevuta di pagamento";
  text(brand, left, 20, true);
  let headerY = y - 18;
  if (input.issuer && input.issuer.trim() && input.issuer.trim() !== brand) {
    page.drawText(pdfSafeText(input.issuer), { x: left, y: headerY, size: 10, font, color: muted });
    headerY -= 14;
  }

  const numberWidth = bold.widthOfTextAtSize(pdfSafeText(input.number), 10);
  page.drawText(pdfSafeText(input.number), { x: right - numberWidth, y: 766, size: 10, font: bold, color: dark });
  const dateLabel = `Data: ${formatDate(input.paidAt, input.locale)}`;
  const dateWidth = font.widthOfTextAtSize(pdfSafeText(dateLabel), 10);
  page.drawText(pdfSafeText(dateLabel), { x: right - dateWidth, y: 750, size: 10, font, color: muted });

  y = 720;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });
  y -= 42;

  text("Ricevuta di pagamento", left, 16, true);
  y -= 16;
  page.drawText(pdfSafeText(`N. ${input.number}`), { x: left, y, size: 10, font, color: muted });
  y -= 34;

  text("Cliente", left, 9, false, muted);
  y -= 16;
  text(input.leadName || "-", left, 13, true);
  y -= 38;

  text("Descrizione", left, 9, false, muted);
  y -= 16;
  const description = input.description || "Prestazione professionale - pagamento ricevuto";
  for (const chunk of wrap(description, 78)) {
    text(chunk, left, 12);
    y -= 17;
  }
  y -= 14;

  // Riquadro importo.
  const boxTop = y + 8;
  const boxHeight = 74;
  page.drawRectangle({
    x: left,
    y: boxTop - boxHeight,
    width: right - left,
    height: boxHeight,
    color: rgb(0.96, 0.99, 0.97),
    borderColor: rgb(0.75, 0.9, 0.83),
    borderWidth: 1,
  });
  text("Importo pagato", left + 18, 9, false, muted);
  text(
    formatCurrency(input.amount, input.locale, input.currency || undefined),
    left + 18,
    24,
    true,
    accent
  );
  const method = `Metodo: ${methodLabel(input.method)}`;
  const methodWidth = font.widthOfTextAtSize(pdfSafeText(method), 10);
  page.drawText(pdfSafeText(method), {
    x: right - 18 - methodWidth,
    y: boxTop - 44,
    size: 10,
    font,
    color: muted,
  });
  y = boxTop - boxHeight - 40;

  if (input.notes?.trim()) {
    text("Note", left, 9, false, muted);
    y -= 16;
    for (const chunk of wrap(input.notes.trim(), 90)) {
      text(chunk, left, 10);
      y -= 14;
    }
    y -= 10;
  }

  // Piè di pagina fisso.
  const footerY = 92;
  page.drawLine({ start: { x: left, y: footerY + 28 }, end: { x: right, y: footerY + 28 }, thickness: 1, color: line });
  text("Non e' un documento fiscale.", left, 9, true);
  page.drawText(pdfSafeText("Registra il pagamento ricevuto, non la fattura."), {
    x: left,
    y: footerY + 6,
    size: 9,
    font,
    color: muted,
  });
  const generated = `Generato il ${formatDate(new Date(), input.locale)}`;
  const generatedWidth = font.widthOfTextAtSize(pdfSafeText(generated), 9);
  page.drawText(pdfSafeText(generated), { x: right - generatedWidth, y: footerY + 6, size: 9, font, color: muted });
  text("Lead Machine", left, 9, false, muted);

  return doc.save();
}

// Spezza il testo in righe che stanno nella larghezza indicata: pdf-lib non
// va a capo da solo e una descrizione lunga uscirebbe dalla pagina.
export function wrap(value: string, maxChars: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
