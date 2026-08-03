"use client";

import * as React from "react";
import { DEFAULT_LOCALE, LOCALES, type LocaleCode, localeToBCP47, getLocale } from "@/lib/i18n-config";
import { translate } from "@/lib/i18n-dictionaries";

export type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string | null | undefined) => string;
  formatCurrency: (n: number, currencyOverride?: string) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  formatDistance: (meters: number) => string;
  bcp47: string;
  config: typeof LOCALES[LocaleCode];
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "lead-machine-locale";

function readInitial(): LocaleCode {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return getLocale(saved);
  } catch {}
  try {
    const nav = (navigator.language || DEFAULT_LOCALE).slice(0, 2);
    return getLocale(nav);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<LocaleCode>(() => readInitial());

  const setLocale = React.useCallback((code: LocaleCode) => {
    setLocaleState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {}
    try {
      document.documentElement.setAttribute("lang", localeToBCP47(code));
    } catch {}
  }, []);

  const bcp47 = React.useMemo(() => localeToBCP47(locale), [locale]);
  const config = React.useMemo(() => LOCALES[locale], [locale]);

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const formatDate = React.useCallback(
    (date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
      if (!date) return "-";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString(bcp47, opts || config.dateFormat);
    },
    [bcp47, config.dateFormat]
  );

  const formatDateTime = React.useCallback(
    (date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
      if (!date) return "-";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      const defaultOpts: Intl.DateTimeFormatOptions = {
        ...config.dateFormat,
        hour: "2-digit",
        minute: "2-digit",
      };
      return d.toLocaleString(bcp47, opts || defaultOpts);
    },
    [bcp47, config.dateFormat]
  );

  const formatTime = React.useCallback(
    (date: Date | string | null | undefined) => {
      if (!date) return "-";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleTimeString(bcp47, { hour: "2-digit", minute: "2-digit" });
    },
    [bcp47]
  );

  const formatCurrency = React.useCallback(
    (n: number, currencyOverride?: string) => {
      const currency = currencyOverride || config.currency;
      return new Intl.NumberFormat(bcp47, { style: "currency", currency }).format(Number(n) || 0);
    },
    [bcp47, config.currency]
  );

  const formatNumber = React.useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(bcp47, opts).format(Number(n) || 0);
    },
    [bcp47]
  );

  const formatDistance = React.useCallback(
    (meters: number) => {
      const m = Number(meters) || 0;
      if (config.distanceUnit === "mi") {
        const miles = m / 1609.344;
        const value = miles < 1 ? Math.round(m / 16.093) / 100 : Math.round(miles * 10) / 10;
        const key = miles < 0.1 ? "distance.km" : "distance.mi";
        return t(key, { n: value });
      }
      const km = m / 1000;
      const value = km < 1 ? Math.round(m) / 1000 : Math.round(km * 10) / 10;
      const key = km < 1 ? "distance.km" : "distance.km";
      return t(key, { n: value });
    },
    [config.distanceUnit, t]
  );

  // Sincronizza lang su html al mount e al cambio
  React.useEffect(() => {
    try {
      document.documentElement.setAttribute("lang", bcp47);
    } catch {}
  }, [bcp47]);

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
      formatDateTime,
      formatTime,
      formatCurrency,
      formatNumber,
      formatDistance,
      bcp47,
      config,
    }),
    [locale, setLocale, t, formatDate, formatDateTime, formatTime, formatCurrency, formatNumber, formatDistance, bcp47, config]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
