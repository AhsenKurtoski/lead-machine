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

// Le etichette dei bucket sono testi di interfaccia: vivono nel dizionario,
// come tutte le altre, cosi' `npm run i18n:check` le copre e nessuna lingua
// ricade sull'italiano. Prima erano scritte a mano qui.
const BUCKET_KEYS: Record<DueBucket, string> = {
  scaduto: "followup.bucket.overdue",
  oggi: "followup.bucket.today",
  prossimi: "followup.bucket.upcoming",
};

export function bucketLabel(bucket: DueBucket, locale?: LocaleCode | null): string {
  return translate(locale || DEFAULT_LOCALE, BUCKET_KEYS[bucket]);
}
