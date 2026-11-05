// ============================================================
// SEO del progetto: un unico posto per titoli, keywords, dati
// strutturati, rotte pubbliche e regole per i crawler.
//
// Sta qui e non dentro layout.tsx/sitemap.ts/robots.ts perche cosi
// e verificabile con test reali (src/lib/seo.test.ts) invece che a
// occhio: se un domani sparisce una keyword, un autore o una rotta,
// il test lo dice subito.
// Nessuna richiesta di rete: solo dati statici e il filesystem.
// ============================================================

import type { Metadata } from "next";
import { AUTHOR } from "./author";

export const SITE_NAME = "Lead Machine";

/** Sito canonico quando NEXT_PUBLIC_BASE_URL non e configurato. */
export const DEFAULT_SITE_URL = "http://localhost:3000";

/** Autore del progetto: cercato anche per nome (credito di authorship). */
export const SITE_AUTHOR = AUTHOR;

export const SITE_TITLE = "Lead Machine — Open-Source Lead Generation CRM";

export const SITE_DESCRIPTION =
  "Lead Machine is a free, open-source, self-hosted prospecting tool. Find nearby businesses on OpenStreetMap — especially those with no website — verify their contact data, score them and reach out by email or WhatsApp, all from a single SQLite-backed Next.js app.";

/**
 * Keywords dei meta tag. Il nome dell'autore e del brand sono qui di
 * proposito: il progetto e open source e viene cercato anche per chi
 * l'ha creato.
 */
export const SITE_KEYWORDS: string[] = [
  // Autore e brand: chi cerca il nome deve arrivare al progetto, e chi cerca il
  // progetto deve vedere subito chi l'ha creato.
  "Ahsen Kurtoski",
  "Ahsen Kurtoski Lead Machine",
  "Ahsen Kurtoski lead generation",
  "Ahsen Kurtoski open source",
  "Ahsen Kurtoski software developer",
  "created by Ahsen Kurtoski",
  "who created Lead Machine",
  "AhsenKurtoski",
  "Ahsen Studio",
  "Lead Machine",
  // Prodotto.
  "lead generation",
  "lead generation software",
  "open source lead generation",
  "open source crm",
  "self hosted crm",
  "prospecting tool",
  "local lead finder",
  "businesses without website",
  // Dati e tecnologia.
  "openstreetmap",
  "overpass api",
  "nominatim geocoding",
  "lead scoring",
  "local seo",
  "data verification",
  "whatsapp outreach",
  "email outreach",
  "next.js",
  "prisma",
  "sqlite",
  "self hosted",
  "freelancer",
  "small business",
];

/** Pagine pubbliche indicizzabili, in ordine di importanza. */
export type PublicRoute = {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
};

// La home ("/") non e' in elenco: reindirizza a /dashboard, e una sitemap non
// deve elencare URL di redirect (Google vuole URL che rispondono 200).
export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/dashboard", priority: 1, changeFrequency: "daily" },
  { path: "/ricerca", priority: 0.9, changeFrequency: "daily" },
  { path: "/opportunita", priority: 0.8, changeFrequency: "daily" },
  { path: "/crm", priority: 0.8, changeFrequency: "daily" },
  { path: "/mappa", priority: 0.7, changeFrequency: "weekly" },
  { path: "/portfolio", priority: 0.6, changeFrequency: "weekly" },
  { path: "/ricevuta", priority: 0.5, changeFrequency: "weekly" },
  { path: "/report", priority: 0.5, changeFrequency: "weekly" },
  { path: "/guida", priority: 0.5, changeFrequency: "monthly" },
  { path: "/cold-call", priority: 0.5, changeFrequency: "monthly" },
  { path: "/calendario", priority: 0.4, changeFrequency: "weekly" },
  { path: "/attivita", priority: 0.4, changeFrequency: "weekly" },
  { path: "/email", priority: 0.4, changeFrequency: "monthly" },
  { path: "/whatsapp", priority: 0.4, changeFrequency: "monthly" },
  { path: "/messaggi", priority: 0.4, changeFrequency: "monthly" },
  { path: "/impostazioni", priority: 0.3, changeFrequency: "monthly" },
];

/**
 * Percorsi che i crawler non devono indicizzare:
 * - /api/ sono endpoint, non pagine;
 * - /demo/{id} e l'anteprima generata per una singola attivita: non e
 *   contenuto del progetto e non deve finire nei risultati di ricerca.
 */
export const DISALLOWED_PATHS: string[] = ["/api/", "/demo/"];

/** URL canonico del sito (env-driven, con default locale). */
export function resolveSiteUrl(env: string | undefined = process.env.NEXT_PUBLIC_BASE_URL): string {
  const raw = (env ?? "").trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

/** Metadata completi della root, usati da src/app/layout.tsx. */
export function buildSiteMetadata(): Metadata {
  const siteUrl = resolveSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SITE_TITLE,
      template: "%s · " + SITE_NAME,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_AUTHOR.name, url: SITE_AUTHOR.url }, { name: SITE_NAME + " Contributors" }],
    creator: SITE_AUTHOR.name,
    publisher: SITE_NAME,
    category: "technology",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    // Nessun `alternates.canonical` qui: i metadata della root vengono
    // ereditati da ogni pagina, quindi un canonical nella root dichiarerebbe
    // OGNI pagina come duplicato della home (e i motori di ricerca non
    // indicizzerebbero /opportunita, /crm, ...). Il canonical e' per pagina:
    // vedi `buildPageMetadata`.
    icons: {
      icon: "/logo.png",
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      type: "website",
      locale: "it_IT",
      siteName: SITE_NAME,
      url: "/",
      images: [{ url: "/logo.png", width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: ["/logo.png"],
    },
  };
}

/**
 * Metadata di una pagina pubblica: titolo, descrizione (facoltativa) e
 * **canonical proprio**. Va usato in ogni pagina pubblica: senza canonical
 * la pagina erediterebbe quello della root e risulterebbe un duplicato
 * della home. `src/lib/seo.test.ts` verifica che ogni rotta pubblica lo
 * dichiari davvero con il proprio percorso.
 */
export function buildPageMetadata(input: {
  path: string;
  title: string;
  description?: string;
}): Metadata {
  return {
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    alternates: { canonical: input.path },
  };
}

/** Il nodo schema.org della persona che ha creato il progetto. */
export function personNode(): Record<string, unknown> {
  return {
    "@type": "Person",
    name: AUTHOR.name,
    alternateName: AUTHOR.handle,
    jobTitle: AUTHOR.jobTitle,
    url: AUTHOR.url,
    sameAs: [AUTHOR.url],
  };
}

/**
 * Dati strutturati schema.org: dicono ai motori di ricerca cos'e il
 * progetto, chi l'ha creato e che e gratuito.
 */
export function buildStructuredData(): Record<string, unknown> {
  const siteUrl = resolveSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    alternateName: SITE_TITLE,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SITE_DESCRIPTION,
    url: siteUrl + "/",
    keywords: SITE_KEYWORDS.join(", "),
    license: "https://opensource.org/licenses/MIT",
    inLanguage: "it-IT",
    isAccessibleForFree: true,
    // Chi l'ha creato, in chiaro: i motori di ricerca collegano il progetto alla
    // persona (author + creator + sameAs) invece di trattarlo come anonimo.
    author: personNode(),
    creator: personNode(),
    copyrightHolder: personNode(),
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };
}

/** Voci del sitemap.xml a partire dalle rotte pubbliche. */
export function buildSitemapEntries(lastModified?: Date) {
  const siteUrl = resolveSiteUrl();
  return PUBLIC_ROUTES.map((route) => ({
    url: siteUrl + route.path,
    // Non inventare una data di modifica a ogni richiesta: senza una data
    // reale e' meglio ometterla che dire ai crawler che tutto cambia oggi.
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

/** Regole per i crawler, usate da src/app/robots.ts. */
export function buildRobotsRules() {
  return {
    userAgent: "*",
    allow: "/",
    disallow: DISALLOWED_PATHS,
  };
}
