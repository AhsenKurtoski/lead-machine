import { DEFAULT_LOCALE, LOCALES, type LocaleCode, getLocale, localeToBCP47 } from "./i18n-config";
import { translate } from "./i18n-dictionaries";
import { getSettings } from "./settings";

export async function getServerLocale(): Promise<LocaleCode> {
  try {
    const s = await getSettings();
    if (s.locale) return getLocale(s.locale);
  } catch {}
  return DEFAULT_LOCALE;
}

export function serverT(locale: LocaleCode, key: string, vars?: Record<string, string | number>): string {
  return translate(locale, key, vars);
}

export function serverFormatDate(
  locale: LocaleCode,
  date: Date | string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const bcp47 = localeToBCP47(locale);
  const cfg = LOCALES[locale];
  return d.toLocaleDateString(bcp47, opts || cfg.dateFormat);
}

export function serverFormatDateTime(
  locale: LocaleCode,
  date: Date | string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const bcp47 = localeToBCP47(locale);
  const cfg = LOCALES[locale];
  return d.toLocaleString(bcp47, opts || { ...cfg.dateFormat, hour: "2-digit", minute: "2-digit" });
}

export function serverFormatTime(locale: LocaleCode, date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString(localeToBCP47(locale), { hour: "2-digit", minute: "2-digit" });
}

export function serverFormatCurrency(
  locale: LocaleCode,
  n: number,
  currencyOverride?: string
): string {
  const cfg = LOCALES[locale];
  const currency = currencyOverride || cfg.currency;
  return new Intl.NumberFormat(localeToBCP47(locale), { style: "currency", currency }).format(Number(n) || 0);
}

export function serverFormatDistance(locale: LocaleCode, meters: number): string {
  const cfg = LOCALES[locale];
  const m = Number(meters) || 0;
  if (cfg.distanceUnit === "mi") {
    const miles = m / 1609.344;
    const value = miles < 1 ? Math.round(m / 16.093) / 100 : Math.round(miles * 10) / 10;
    return translate(locale, "distance.mi", { n: value });
  }
  const km = m / 1000;
  const value = km < 1 ? Math.round(m) / 1000 : Math.round(km * 10) / 10;
  return translate(locale, "distance.km", { n: value });
}

export function getDefaultCity(locale: LocaleCode, settingsCity?: string | null): string {
  if (settingsCity) return settingsCity;
  return translate(locale, "common.defaultCity");
}

export function getDefaultBrand(locale: LocaleCode, settingsBrand?: string | null): string {
  if (settingsBrand) return settingsBrand;
  return translate(locale, "common.defaultBrand");
}
