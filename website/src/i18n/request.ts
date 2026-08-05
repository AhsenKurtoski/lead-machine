import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { locales, isValidLocale, defaultLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isValidLocale(requested) ? requested : defaultLocale;
  if (!isValidLocale(requested)) notFound();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Europe/Rome",
    now: new Date(),
  };
});

export function getPathnameCandidates(pathname: string) {
  const candidates: string[] = [pathname];
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}`)) {
      candidates.push(pathname.replace(`/${locale}`, ""));
    }
  }
  return candidates;
}

export { locales, defaultLocale };
