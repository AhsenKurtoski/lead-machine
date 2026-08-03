export type LocaleCode = "it" | "de" | "fr" | "sl" | "en" | "es" | "pt";

export type CountryConfig = {
  code: LocaleCode;
  name: string;
  nativeName: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  dateFormat: Intl.DateTimeFormatOptions;
  distanceUnit: "km" | "mi";
  phonePrefix: string;
  countries: string[];
  taxRateDefault: number;
  vatNumberLabel: string;
};

export const LOCALES: Record<LocaleCode, CountryConfig> = {
  it: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    currency: "EUR",
    currencySymbol: "€",
    dateFormat: { day: "2-digit", month: "short", year: "numeric" },
    distanceUnit: "km",
    phonePrefix: "+39",
    countries: ["Italia", "San Marino", "Città del Vaticano"],
    taxRateDefault: 22,
    vatNumberLabel: "Partita IVA",
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    currency: "EUR",
    currencySymbol: "€",
    dateFormat: { day: "2-digit", month: "short", year: "numeric" },
    distanceUnit: "km",
    phonePrefix: "+49",
    countries: ["Deutschland", "Österreich"],
    taxRateDefault: 19,
    vatNumberLabel: "USt-IdNr.",
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    currency: "EUR",
    currencySymbol: "€",
    dateFormat: { day: "2-digit", month: "short", year: "numeric" },
    distanceUnit: "km",
    phonePrefix: "+33",
    countries: ["France", "Monaco"],
    taxRateDefault: 20,
    vatNumberLabel: "TVA",
  },
  sl: {
    code: "sl",
    name: "Slovenian",
    nativeName: "Slovenščina",
    flag: "🇸🇮",
    currency: "EUR",
    currencySymbol: "€",
    dateFormat: { day: "2-digit", month: "short", year: "numeric" },
    distanceUnit: "km",
    phonePrefix: "+386",
    countries: ["Slovenija"],
    taxRateDefault: 22,
    vatNumberLabel: "ID za DDV",
  },
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    currency: "USD",
    currencySymbol: "$",
    dateFormat: { month: "short", day: "2-digit", year: "numeric" },
    distanceUnit: "mi",
    phonePrefix: "+1",
    countries: ["United States", "Canada", "United Kingdom", "Ireland", "Australia", "New Zealand"],
    taxRateDefault: 0,
    vatNumberLabel: "Tax ID",
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    currency: "EUR",
    currencySymbol: "€",
    dateFormat: { day: "2-digit", month: "short", year: "numeric" },
    distanceUnit: "km",
    phonePrefix: "+34",
    countries: ["España", "México", "Argentina", "Chile", "Colombia", "Perú"],
    taxRateDefault: 21,
    vatNumberLabel: "NIF / CIF",
  },
  pt: {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇵🇹",
    currency: "EUR",
    currencySymbol: "€",
    dateFormat: { day: "2-digit", month: "short", year: "numeric" },
    distanceUnit: "km",
    phonePrefix: "+351",
    countries: ["Portugal", "Brasil"],
    taxRateDefault: 23,
    vatNumberLabel: "NIF",
  },
};

export const DEFAULT_LOCALE: LocaleCode = "it";

export function getLocale(code?: string | null): LocaleCode {
  const c = (code || DEFAULT_LOCALE).toLowerCase().slice(0, 2) as LocaleCode;
  return LOCALES[c] ? c : DEFAULT_LOCALE;
}

export function localeToBCP47(code: LocaleCode): string {
  switch (code) {
    case "en":
      return "en-US";
    case "pt":
      return "pt-PT";
    default:
      return `${code}-${code.toUpperCase()}`;
  }
}
