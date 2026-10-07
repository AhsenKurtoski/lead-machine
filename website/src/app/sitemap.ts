import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/config";

const routes = [
  "",
  "/features",
  "/byok-lifetime",
  "/transparency",
  "/deploy",
  "/demo",
  "/docs",
  "/blog",
  "/changelog",
  "/roadmap",
  "/contributors",
  "/status",
  "/about",
  "/privacy",
  "/terms",
  "/cookies",
  "/imprint",
  "/dpa",
  "/security",
  "/demo-request",
  "/partnership",
  "/report-issue",
  "/waitlist",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://leadmachine.dev";

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of routes) {
      const path = locale === defaultLocale && route === "" ? "" : `/${locale}${route}`;
      entries.push({
        url: `${siteUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "monthly" : "weekly",
        priority: route === "" ? 1 : 0.8,
      });
    }
  }

  return entries;
}
