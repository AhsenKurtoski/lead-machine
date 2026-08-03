// ============================================================
// Helper preventivi (funzione O) - puri, usabili lato client e server
// ============================================================

import { DEFAULT_LOCALE, type LocaleCode, localeToBCP47, LOCALES } from "./i18n-config";
import { translate } from "./i18n-dictionaries";

export type QuoteItem = { description: string; qty: number; price: number };

export function parseItems(raw: string | null | undefined): QuoteItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((it: any) => ({
      description: String(it?.description ?? ""),
      qty: Number(it?.qty ?? 1),
      price: Number(it?.price ?? 0),
    }));
  } catch {
    return [];
  }
}

export type QuoteTotals = {
  subtotal: number;
  discount: number;
  taxable: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

export function computeTotals(items: QuoteItem[], discount = 0, taxRate = 0): QuoteTotals {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxable = subtotal - safeDiscount;
  const rate = Number(taxRate) || 0;
  const taxAmount = taxable * (rate / 100);
  const total = taxable + taxAmount;
  return { subtotal, discount: safeDiscount, taxable, taxRate: rate, taxAmount, total };
}

// Acconto / saldo in base alla percentuale richiesta all'accettazione.
export type DepositInfo = { percent: number; deposit: number; balance: number };

export function computeDeposit(total: number, percent: number): DepositInfo {
  const pct = Math.min(Math.max(Number(percent) || 0, 0), 100);
  const deposit = Math.round(((Number(total) || 0) * pct) / 100 * 100) / 100;
  const balance = Math.round(((Number(total) || 0) - deposit) * 100) / 100;
  return { percent: pct, deposit, balance };
}

export function formatCurrency(n: number, locale?: LocaleCode | null, currencyOverride?: string): string {
  const l = locale || DEFAULT_LOCALE;
  const cfg = LOCALES[l];
  const currency = currencyOverride || cfg.currency;
  return new Intl.NumberFormat(localeToBCP47(l), { style: "currency", currency }).format(Number(n) || 0);
}

// Backward-compat alias
export function formatEuro(n: number, locale?: LocaleCode | null, currencyOverride?: string): string {
  return formatCurrency(n, locale, currencyOverride || "EUR");
}

export const QUOTE_STATUS_KEYS: Record<string, string> = {
  bozza: "quote.bozza",
  inviato: "quote.inviato",
  accettato: "quote.accettato",
  rifiutato: "quote.rifiutato",
};

export function quoteStatusLabel(status: string, locale?: LocaleCode | null): string {
  const key = QUOTE_STATUS_KEYS[status] || status;
  const l = locale || DEFAULT_LOCALE;
  const tr = translate(l, key);
  if (tr !== key) return tr;
  return QUOTE_STATUS_LABELS[status] || status;
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
};

// Listino di partenza (modificabile): servizi tipici per attivita locali
export const QUOTE_PRESETS: QuoteItem[] = [
  { description: "Sito web vetrina (1 pagina, responsive)", qty: 1, price: 390 },
  { description: "Sito web multipagina (fino a 5 pagine)", qty: 1, price: 790 },
  { description: "Sistema di prenotazione online (form + email)", qty: 1, price: 190 },
  { description: "Menu / catalogo digitale con QR code", qty: 1, price: 150 },
  { description: "Logo e identita visiva base", qty: 1, price: 150 },
  { description: "Configurazione Google Business Profile", qty: 1, price: 90 },
  { description: "Ottimizzazione SEO locale (Google/Maps)", qty: 1, price: 220 },
  { description: "Gestione social mensile (post + storie)", qty: 1, price: 250 },
  { description: "Campagna Meta Ads - setup iniziale", qty: 1, price: 200 },
  { description: "Servizio fotografico attivita", qty: 1, price: 180 },
  { description: "Dominio + hosting (1 anno)", qty: 1, price: 80 },
  { description: "Manutenzione sito - intervento singolo", qty: 1, price: 25 },
  { description: "Manutenzione sito - pacchetto 5 interventi (12 mesi)", qty: 1, price: 100 },
  { description: "Manutenzione sito - semestrale (6 mesi)", qty: 1, price: 70 },
  { description: "Manutenzione sito - annuale (12 mesi)", qty: 1, price: 120 },
];

// Condizioni di pagamento preimpostate (modificabili)
export const QUOTE_PAYMENT_TERMS: string[] = [
  "Bonifico bancario: 30% all'accettazione, saldo alla consegna",
  "Bonifico bancario: saldo unico alla consegna del lavoro",
  "50% all'avvio dei lavori, 50% alla pubblicazione del sito",
  "Pagamento in 3 rate mensili senza interessi",
  "PayPal o Satispay: 30% di acconto, saldo a fine lavori",
];

export function generateQuoteNumber(seq: number): string {
  const year = new Date().getFullYear();
  return "PREV-" + year + "-" + String(seq).padStart(3, "0");
}

// ============================================================
// Helper fiscali (prestazione occasionale)
// ============================================================

// Soglia annua oltre la quale scattano i contributi INPS Gestione Separata.
export const OCCASIONAL_THRESHOLD = 5000;
// Aliquota ritenuta d'acconto applicata dai committenti con partita IVA.
export const RITENUTA_RATE = 20;
// Soglia oltre la quale serve la marca da bollo da 2 euro sulla ricevuta.
export const BOLLO_THRESHOLD = 77.47;
// Importo della marca da bollo.
export const BOLLO_AMOUNT = 2;
// Dicitura legale obbligatoria per chi opera senza partita IVA (prestazione occasionale).
export const DICITURA_FUORI_CAMPO_IVA =
  "Operazione fuori campo IVA ai sensi dell'art. 5 del DPR 633/1972";

export type RitenutaInfo = { gross: number; ritenuta: number; net: number };

export function computeRitenuta(gross: number, applies = true): RitenutaInfo {
  const g = Number(gross) || 0;
  const ritenuta = applies ? Math.round(g * (RITENUTA_RATE / 100) * 100) / 100 : 0;
  const net = Math.round((g - ritenuta) * 100) / 100;
  return { gross: g, ritenuta, net };
}

// Marca da bollo: 2 euro se l'importo supera 77,47 euro, altrimenti 0.
export function computeBollo(amount: number): number {
  return (Number(amount) || 0) > BOLLO_THRESHOLD ? BOLLO_AMOUNT : 0;
}

export type FiscalSummary = {
  gross: number; // imponibile (nessuna IVA)
  ritenuta: number; // 20% se committente con partita IVA
  netAfterRitenuta: number; // netto dopo ritenuta
  bollo: number; // 2 euro se gross > 77,47
  bolloNeeded: boolean;
  totalDuePrivate: number; // committente privato: gross + bollo
  totalDueBusiness: number; // committente con P.IVA: netto + bollo
};

// Riepilogo fiscale completo per la prestazione occasionale (senza partita IVA).
export function computeFiscalSummary(gross: number): FiscalSummary {
  const g = Math.round((Number(gross) || 0) * 100) / 100;
  const r = computeRitenuta(g, true);
  const bollo = computeBollo(g);
  return {
    gross: g,
    ritenuta: r.ritenuta,
    netAfterRitenuta: r.net,
    bollo,
    bolloNeeded: bollo > 0,
    totalDuePrivate: Math.round((g + bollo) * 100) / 100,
    totalDueBusiness: Math.round((r.net + bollo) * 100) / 100,
  };
}

export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date);
  if (isNaN(target.getTime())) return null;
  const end = new Date(target);
  end.setHours(23, 59, 59, 999);
  const ms = end.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export type ValidityState = {
  state: "none" | "valid" | "soon" | "expired";
  days: number | null;
  label: string;
};

export function quoteValidityState(validUntil: string | Date | null | undefined): ValidityState {
  const days = daysUntil(validUntil);
  if (days === null) return { state: "none", days: null, label: "" };
  if (days < 0) return { state: "expired", days, label: "Scaduto" };
  if (days === 0) return { state: "soon", days, label: "Scade oggi" };
  if (days <= 7) return { state: "soon", days, label: "Scade tra " + days + " g" };
  return { state: "valid", days, label: "Valido (" + days + " g)" };
}

// Calcola il totale di un preventivo a partire dalla stringa JSON delle voci.
export function quoteTotalFromRaw(rawItems: string | null | undefined, discount = 0, taxRate = 0): number {
  return computeTotals(parseItems(rawItems), discount, taxRate).total;
}

// Condizioni generali standard inserite nei preventivi.
export const QUOTE_TERMS: string[] = [
  "Il presente preventivo e valido fino alla data indicata; trascorso tale termine i prezzi potranno essere aggiornati.",
  "I lavori iniziano dopo l'accettazione del preventivo e l'eventuale versamento dell'acconto concordato.",
  "Testi, immagini, loghi e materiali necessari sono forniti dal cliente, salvo diverso accordo scritto.",
  "Sono inclusi fino a 2 cicli di revisione; modifiche ulteriori saranno concordate e quotate a parte.",
  "Dominio, hosting e servizi di terze parti sono a carico del cliente se non diversamente specificato.",
  "Operazione fuori campo IVA ai sensi dell'art. 5 del DPR 633/1972 (prestazione occasionale, attivita non abituale). In presenza di committente con partita IVA si applica la ritenuta d'acconto del 20%.",
];
