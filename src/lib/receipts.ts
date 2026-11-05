// ============================================================
// Ricevute di pagamento — helper PURI (client + server).
//
// Una ricevuta attesta che il cliente HA PAGATO: numero, importo,
// metodo e data. Non e un documento fiscale: qui non esistono
// aliquote, partita IVA, sconti o acconti.
// ============================================================

import { DEFAULT_LOCALE, type LocaleCode, localeToBCP47, LOCALES } from "./i18n-config";

export type ReceiptMethod = "contanti" | "bonifico" | "carta" | "altro";

export const RECEIPT_METHODS: { key: ReceiptMethod; label: string }[] = [
  { key: "contanti", label: "Contanti" },
  { key: "bonifico", label: "Bonifico" },
  { key: "carta", label: "Carta" },
  { key: "altro", label: "Altro" },
];

const METHOD_KEYS = RECEIPT_METHODS.map((m) => m.key);

/** Riporta un metodo arbitrario a uno dei valori ammessi (default: contanti). */
export function normalizeMethod(raw: unknown): ReceiptMethod {
  const s = String(raw ?? "").trim().toLowerCase();
  return (METHOD_KEYS as string[]).includes(s) ? (s as ReceiptMethod) : "contanti";
}

/** Etichetta leggibile di un metodo di pagamento. */
export function methodLabel(raw: unknown): string {
  const key = normalizeMethod(raw);
  return RECEIPT_METHODS.find((m) => m.key === key)?.label ?? "Contanti";
}

/** Importo sicuro: numero finito, mai negativo, arrotondato ai centesimi. */
export function parseAmount(raw: unknown): number {
  const n = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Numero progressivo leggibile: RICEVUTA-2026-001 */
export function generateReceiptNumber(seq: number): string {
  const year = new Date().getFullYear();
  const n = Math.max(1, Math.floor(Number(seq) || 1));
  return "RICEVUTA-" + year + "-" + String(n).padStart(3, "0");
}

export function formatCurrency(n: number, locale?: LocaleCode | null, currencyOverride?: string): string {
  const l = locale || DEFAULT_LOCALE;
  const cfg = LOCALES[l];
  const currency = currencyOverride || cfg.currency;
  return new Intl.NumberFormat(localeToBCP47(l), { style: "currency", currency }).format(Number(n) || 0);
}

// Alias retro-compatibile usato dalle pagine.
export function formatEuro(n: number, locale?: LocaleCode | null, currencyOverride?: string): string {
  return formatCurrency(n, locale, currencyOverride || "EUR");
}

/** Data di pagamento in formato ISO-safe per gli input `date`. */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
