// Test della configurazione SEO (src/lib/seo.ts).
// Non usa mock: legge i dati reali E verifica sul filesystem che ogni
// rotta pubblica abbia davvero la sua pagina. Runner: `npm test`.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  buildPageMetadata,
  buildRobotsRules,
  buildSitemapEntries,
  buildSiteMetadata,
  buildStructuredData,
  DEFAULT_SITE_URL,
  DISALLOWED_PATHS,
  PUBLIC_ROUTES,
  resolveSiteUrl,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_TITLE,
} from "./seo";

const APP_DIR = join(process.cwd(), "src", "app");

test("seo: l'autore del progetto e presente nelle keywords come persona", () => {
  const lower = SITE_KEYWORDS.map((k) => k.toLowerCase());
  assert.ok(lower.includes(SITE_AUTHOR.name.toLowerCase()), "manca il nome completo dell'autore");
  assert.ok(lower.includes("ahsenkurtoski"), "manca la variante senza spazi: e cosi che si cerca");
  assert.ok(SITE_KEYWORDS.length >= 20, "elenco keywords troppo povero");
  // Chi cerca chi ha creato l'app (o il progetto per nome) deve trovare questo
  // progetto, non un omonimo qualsiasi.
  assert.ok(
    lower.some((k) => k.includes(SITE_AUTHOR.name.toLowerCase()) && k.includes("lead machine")),
    "manca la keyword che lega autore e progetto"
  );
  assert.ok(
    lower.some((k) => k.startsWith("created by ") || k.startsWith("who created ")),
    "manca l'intento 'chi l'ha creato'"
  );
});

test("seo: chi ha creato il progetto si vede subito, in ogni punto pubblico", () => {
  // Il credito non deve stare in un posto solo: keywords, metadata, dati
  // strutturati, interfaccia, package.json e README devono tutti dire lo stesso
  // nome, altrimenti chi cerca l'autore non arriva al progetto.
  const name = SITE_AUTHOR.name;

  // 1) Keywords dei meta tag (verificate sopra, qui il legame autore -> progetto).
  assert.ok(SITE_KEYWORDS.some((k) => k.includes(name)));

  // 2) Metadata della root: autore e creatore.
  const m = buildSiteMetadata();
  assert.equal(m.creator, name);
  const authors = (m.authors ?? []) as Array<{ name?: string; url?: string }>;
  assert.ok(
    authors.some((a) => a.name === name && a.url === SITE_AUTHOR.url),
    "l'autore nei metadata deve avere anche il suo profilo pubblico"
  );

  // 3) Dati strutturati: author, creator e copyrightHolder sono la stessa persona,
  //    collegata al profilo (sameAs).
  const ld = buildStructuredData();
  for (const campo of ["author", "creator", "copyrightHolder"]) {
    const node = ld[campo] as { "@type"?: string; name?: string; sameAs?: string[] };
    assert.equal(node?.["@type"], "Person", campo + " non e' una persona");
    assert.equal(node?.name, name, campo + " senza il nome dell'autore");
    assert.ok(node?.sameAs?.includes(SITE_AUTHOR.url), campo + " senza il profilo pubblico");
  }

  // 4) Interfaccia: il credito c'e' in tutte e 7 le lingue (e nella barra
  //    laterale, quindi in ogni pagina).
  const dictSource = readFileSync(join(process.cwd(), "src", "lib", "i18n-dictionaries.ts"), "utf8");
  const crediti = Array.from(dictSource.matchAll(/"app\.creator":\s*"([^"]+)"/g), (mm) => mm[1]);
  assert.equal(crediti.length, 7, "il credito deve esistere in tutte le 7 lingue");
  for (const testo of crediti) {
    assert.ok(testo.includes(name), "un credito tradotto non nomina l'autore: " + testo);
  }
  const shell = readFileSync(join(process.cwd(), "src", "components", "app-shell.tsx"), "utf8");
  assert.match(shell, /t\("app\.creator"\)/, "la barra laterale non mostra il credito");

  // 5) package.json: autore e keywords.
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    author?: string;
    keywords?: string[];
  };
  assert.ok((pkg.author ?? "").includes(name), "package.json senza autore");
  assert.ok(
    (pkg.keywords ?? []).some((k) => k.toLowerCase().includes(name.toLowerCase())),
    "package.json senza keyword sull'autore"
  );

  // 6) README: il credito in chiaro.
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
  assert.match(readme, new RegExp("Created by " + name), "README senza credito");
});

test("seo: keywords, titolo e descrizione sono utilizzabili dai motori di ricerca", () => {
  assert.equal(new Set(SITE_KEYWORDS).size, SITE_KEYWORDS.length, "keywords duplicate");
  for (const k of SITE_KEYWORDS) {
    assert.equal(k, k.trim());
    assert.ok(k.length >= 3 && k.length <= 60, "keyword fuori misura: " + k);
  }
  assert.ok(SITE_TITLE.length > 0 && SITE_TITLE.length <= 70, "titolo troppo lungo per Google");
  assert.ok(SITE_DESCRIPTION.length >= 120 && SITE_DESCRIPTION.length <= 320, "descrizione fuori misura");
  assert.ok(SITE_DESCRIPTION.includes("open-source"));
});

test("seo: la root non impone un canonical (lo dichiara ogni pagina)", () => {
  const m = buildSiteMetadata();
  assert.equal(
    m.alternates,
    undefined,
    "un canonical nella root marcherebbe ogni pagina come duplicato della home"
  );
});

test("seo: buildPageMetadata da a ogni pagina il proprio canonical", () => {
  const m = buildPageMetadata({ path: "/opportunita", title: "Opportunita senza sito" });
  assert.equal(m.alternates?.canonical, "/opportunita");
  assert.equal(m.title, "Opportunita senza sito");
  assert.equal(m.description, undefined);
  const withDesc = buildPageMetadata({ path: "/", title: "Lead Machine", description: "ciao" });
  assert.equal(withDesc.alternates?.canonical, "/");
  assert.equal(withDesc.description, "ciao");
});

test("seo: ogni rotta pubblica dichiara il proprio canonical nella sua pagina", () => {
  for (const route of PUBLIC_ROUTES) {
    const dir =
      route.path === "/" ? APP_DIR : join(APP_DIR, ...route.path.split("/").filter(Boolean));
    const pageFile = join(dir, "page.tsx");
    const page = readFileSync(pageFile, "utf8");
    const escaped = route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // `canonical: "/x"` (oggetto metadata scritto a mano) oppure
    // `path: "/x"` (metadata costruito con buildPageMetadata).
    const re = new RegExp("(canonical|path):\\s*[\"']" + escaped + "[\"']");
    if (re.test(page)) continue;
    // Next vieta `metadata` nei file `"use client"`: per quelle pagine il
    // canonical deve stare nel layout della rotta, non altrove.
    assert.match(page, /^\s*["']use client["'];/, "canonical assente in " + route.path);
    const layoutFile = join(dir, "layout.tsx");
    assert.ok(existsSync(layoutFile), "manca il layout col canonical di " + route.path);
    assert.ok(
      re.test(readFileSync(layoutFile, "utf8")),
      "canonical mancante o diverso in " + route.path + "/layout.tsx"
    );
  }
});

test("seo: metadata root completi (openGraph, twitter, robots, autore)", () => {
  const m = buildSiteMetadata();
  assert.ok(m.metadataBase instanceof URL);
  assert.equal(m.creator, SITE_AUTHOR.name);
  const authors = (m.authors ?? []) as Array<{ name: string; url?: string }>;
  assert.ok(authors.some((a) => a.name === SITE_AUTHOR.name && a.url === SITE_AUTHOR.url));
  assert.ok(m.openGraph && m.twitter);
  const og = m.openGraph as { images?: unknown; siteName?: string };
  assert.ok(og.images, "openGraph senza immagine");
  assert.equal(og.siteName, "Lead Machine");
  const robots = m.robots as { index?: boolean; follow?: boolean };
  assert.equal(robots.index, true);
  assert.equal(robots.follow, true);
  assert.equal(m.keywords, SITE_KEYWORDS);
});

test("seo: i dati strutturati dichiarano il progetto, l'autore e che e gratis", () => {
  const ld = buildStructuredData();
  assert.equal(ld["@context"], "https://schema.org");
  assert.equal(ld["@type"], "SoftwareApplication");
  assert.equal(ld.isAccessibleForFree, true);
  const author = ld.author as { name?: string; url?: string };
  assert.equal(author.name, SITE_AUTHOR.name);
  assert.equal(author.url, SITE_AUTHOR.url);
  const offers = ld.offers as { price?: string };
  assert.equal(offers.price, "0");
  assert.ok(typeof ld.url === "string" && ld.url.startsWith("http"));
});

test("seo: resolveSiteUrl usa l'env, ripulisce lo slash finale e ha un default", () => {
  assert.equal(resolveSiteUrl(undefined), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl("  "), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl("https://lead-machine.dev/"), "https://lead-machine.dev");
  assert.equal(resolveSiteUrl("https://crm.example.com"), "https://crm.example.com");
});

test("seo: ogni rotta pubblica ha la sua pagina reale su disco", () => {
  const paths = PUBLIC_ROUTES.map((r) => r.path);
  assert.equal(new Set(paths).size, paths.length, "rotte duplicate nel sitemap");
  for (const route of PUBLIC_ROUTES) {
    assert.ok(route.path.startsWith("/"), "rotta senza slash iniziale: " + route.path);
    assert.ok(route.priority > 0 && route.priority <= 1, "priorita fuori scala: " + route.path);
    const pageFile =
      route.path === "/" ? join(APP_DIR, "page.tsx") : join(APP_DIR, ...route.path.split("/").filter(Boolean), "page.tsx");
    assert.ok(existsSync(pageFile), "la rotta pubblica non esiste nel repo: " + route.path);
  }
});

test("seo: il sitemap non contiene percorsi vietati ai crawler", () => {
  for (const route of PUBLIC_ROUTES) {
    for (const bad of DISALLOWED_PATHS) {
      assert.ok(!route.path.startsWith(bad), "rotta vietata presente nel sitemap: " + route.path);
    }
  }
});

test("seo: il sitemap usa l'URL canonico e una voce per rotta", () => {
  const when = new Date("2026-10-11T00:00:00.000Z");
  const entries = buildSitemapEntries(when);
  assert.equal(entries.length, PUBLIC_ROUTES.length);
  assert.equal(entries[0].url, DEFAULT_SITE_URL + "/" + PUBLIC_ROUTES[0].path.split("/").filter(Boolean)[0]);
  assert.ok(
    entries.every((e) => e.url !== DEFAULT_SITE_URL + "/"),
    "la sitemap non deve elencare la home: reindirizza a /dashboard"
  );
  for (const e of entries) {
    assert.ok(e.url.startsWith(DEFAULT_SITE_URL + "/"));
    assert.equal(e.lastModified, when);
  }
});

test("seo: la home e un redirect HTTP alla dashboard, non un meta refresh", () => {
  const config = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8");
  assert.match(
    config,
    /source:\s*["'\/][\s\S]{0,120}?destination:\s*["']\/dashboard["']/,
    "manca il redirect HTTP da / a /dashboard in next.config.mjs"
  );
});

test("seo: le regole per i crawler bloccano le API e le anteprime demo", () => {
  const rules = buildRobotsRules();
  assert.equal(rules.allow, "/");
  assert.ok(rules.disallow.includes("/api/"));
  assert.ok(rules.disallow.includes("/demo/"));
});
