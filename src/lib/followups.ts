// ============================================================
// Helper follow-up & appuntamenti (funzioni H + N)
// Funzioni pure, utilizzabili sia lato client sia lato server.
// ============================================================

import { DEFAULT_LOCALE, type LocaleCode, localeToBCP47, LOCALES } from "./i18n-config";
import { translate } from "./i18n-dictionaries";

export const FOLLOWUP_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  chiamata: "Chiamata",
};

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

export function formatTime(
  date: Date | string | null | undefined,
  locale?: LocaleCode | null
): string {
  if (!date) return "";
  const l = locale || DEFAULT_LOCALE;
  return new Date(date).toLocaleTimeString(localeToBCP47(l), { hour: "2-digit", minute: "2-digit" });
}

export type DueBucket = "scaduto" | "oggi" | "prossimi";

// Classifica un promemoria in base alla scadenza rispetto a ora.
export function dueBucket(dueDate: Date | string): DueBucket {
  const d = new Date(dueDate);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  if (d < startToday) return "scaduto";
  if (d < startTomorrow) return "oggi";
  return "prossimi";
}

export function bucketLabel(bucket: DueBucket, locale?: LocaleCode | null): string {
  const l = locale || DEFAULT_LOCALE;
  const keys: Record<DueBucket, string> = {
    scaduto: "Follow-up: bucket labels not in dict - fallback",
    oggi: "Follow-up: bucket labels not in dict - fallback",
    prossimi: "Follow-up: bucket labels not in dict - fallback",
  };
  const fallbacks: Record<DueBucket, string> = {
    scaduto: "In ritardo",
    oggi: "Oggi",
    prossimi: "Prossimi",
  };
  const tr = translate(l, keys[bucket]);
  if (tr !== keys[bucket]) return tr;
  return fallbacks[bucket];
}

export const BUCKET_LABELS: Record<DueBucket, string> = {
  scaduto: "In ritardo",
  oggi: "Oggi",
  prossimi: "Prossimi",
};
