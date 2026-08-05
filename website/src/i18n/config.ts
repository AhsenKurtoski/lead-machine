export const locales = ["en", "it", "de", "fr", "sl", "es", "pt"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, { native: string; english: string; flag: string; currency: string; bcp47: string }> = {
  en: { native: "English", english: "English", flag: "🇺🇸", currency: "USD", bcp47: "en-US" },
  it: { native: "Italiano", english: "Italian", flag: "🇮🇹", currency: "EUR", bcp47: "it-IT" },
  de: { native: "Deutsch", english: "German", flag: "🇩🇪", currency: "EUR", bcp47: "de-DE" },
  fr: { native: "Français", english: "French", flag: "🇫🇷", currency: "EUR", bcp47: "fr-FR" },
  sl: { native: "Slovenščina", english: "Slovenian", flag: "🇸🇮", currency: "EUR", bcp47: "sl-SI" },
  es: { native: "Español", english: "Spanish", flag: "🇪🇸", currency: "EUR", bcp47: "es-ES" },
  pt: { native: "Português", english: "Portuguese", flag: "🇵🇹", currency: "EUR", bcp47: "pt-PT" },
};

export function isValidLocale(locale: string | undefined | null): locale is Locale {
  return (
    typeof locale === "string" &&
    (locales as readonly string[]).includes(locale)
  );
}

export function getLocaleFromNavigator(fallback: Locale = defaultLocale): Locale {
  if (typeof navigator === "undefined") return fallback;
  const nav = navigator.language?.slice(0, 2);
  return isValidLocale(nav) ? nav : fallback;
}
