import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_LOCALE, type LocaleCode, localeToBCP47, LOCALES } from "./i18n-config";
import { translate } from "./i18n-dictionaries";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function t(locale: LocaleCode | undefined | null, key: string, vars?: Record<string, string | number>): string {
  const l = locale || DEFAULT_LOCALE;
  return translate(l, key, vars);
}

export const STATUS_LABELS: Record<string, string> = {
  NUOVO: "status.NUOVO",
  CONTATTATO: "status.CONTATTATO",
  IN_TRATTATIVA: "status.IN_TRATTATIVA",
  CLIENTE: "status.CLIENTE",
  SCARTATO: "status.SCARTATO",
};

export function statusLabel(status: string, locale?: LocaleCode | null): string {
  const key = STATUS_LABELS[status] || status;
  return t(locale, key);
}

export const STATUS_COLORS: Record<string, string> = {
  NUOVO: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  CONTATTATO: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  IN_TRATTATIVA: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  CLIENTE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  SCARTATO: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
};

export function priorityColor(score: number): string {
  if (score >= 80) return "text-red-600 dark:text-red-400";
  if (score >= 60) return "text-orange-600 dark:text-orange-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-zinc-500";
}

export function formatDate(
  date: Date | string | null | undefined,
  locale?: LocaleCode | null,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "-";
  const l = locale || DEFAULT_LOCALE;
  const cfg = LOCALES[l];
  return new Date(date).toLocaleDateString(localeToBCP47(l), opts || cfg.dateFormat);
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale?: LocaleCode | null
): string {
  if (!date) return "-";
  const l = locale || DEFAULT_LOCALE;
  const cfg = LOCALES[l];
  return new Date(date).toLocaleString(localeToBCP47(l), {
    ...cfg.dateFormat,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string | null | undefined, locale?: LocaleCode | null): string {
  if (!date) return "-";
  const l = locale || DEFAULT_LOCALE;
  return new Date(date).toLocaleTimeString(localeToBCP47(l), { hour: "2-digit", minute: "2-digit" });
}

export function formatCurrency(
  n: number,
  locale?: LocaleCode | null,
  currencyOverride?: string
): string {
  const l = locale || DEFAULT_LOCALE;
  const cfg = LOCALES[l];
  const currency = currencyOverride || cfg.currency;
  return new Intl.NumberFormat(localeToBCP47(l), { style: "currency", currency }).format(Number(n) || 0);
}

export function activityTypeLabel(type: string, locale?: LocaleCode | null): string {
  return t(locale, "activity." + type) || type;
}

export function emailStatusLabel(status: string, locale?: LocaleCode | null): string {
  return t(locale, "email.status." + status) || status;
}
