#!/usr/bin/env node
// ============================================================
// Controllo dell'interfaccia su un server di produzione acceso.
//
// Serve a impedire che tornino i problemi trovati a mano piu' volte:
//   - errori e warning in console (compresi gli errori di idratazione e le
//     richieste API che rispondono 401/5xx su una pagina gia' autenticata);
//   - overflow orizzontale della pagina (un grafico o una card che sfonda il
//     viewport, come capitava alla dashboard a 320 px);
//   - il tema che non viene applicato (chiaro/scuro).
//
// Uso:
//   npm run build && APP_PASSWORD=... PORT=3111 npm start
//   APP_PASSWORD=... BASE_URL=http://127.0.0.1:3111 node scripts/check-ui.mjs
//
// Opzioni:
//   --theme=light|dark|both   temi da controllare (default both)
//   --mobile                  aggiunge il giro a 390x844 (solo avvisi)
//   --contrast                aggiunge il controllo del contrasto del testo
//                             (solo avvisi: e' una stima, non un audit WCAG)
//
// Esce con codice 1 se trova un problema bloccante. Gli avvisi non fanno
// fallire il controllo: sono cose da guardare, non regressioni certe.
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || process.env.SMOKE_BASE || "http://127.0.0.1:3111").replace(/\/$/, "");
const password = process.env.APP_PASSWORD || process.env.SMOKE_PASSWORD || "";
const args = new Set(process.argv.slice(2));
const themeArg = [...args].find((a) => a.startsWith("--theme="))?.split("=")[1] || "both";
const themes = themeArg === "both" ? ["light", "dark"] : [themeArg];
const withMobile = args.has("--mobile");
const withContrast = args.has("--contrast");

if (!password) {
  console.error("APP_PASSWORD non impostata: il controllo deve partire da una sessione autenticata.");
  process.exit(1);
}

// Pagine autenticate dell'app. Le pagine di dettaglio (/crm/{id},
// /ricevuta/{id}) richiedono un record e sono coperte dai test delle API.
const PAGES = [
  ["dashboard", "/dashboard"],
  ["ricerca", "/ricerca"],
  ["crm", "/crm"],
  ["mappa", "/mappa"],
  ["opportunita", "/opportunita"],
  ["report", "/report"],
  ["calendario", "/calendario"],
  ["attivita", "/attivita"],
  ["messaggi", "/messaggi"],
  ["cold-call", "/cold-call"],
  ["whatsapp", "/whatsapp"],
  ["email", "/email"],
  ["ricevuta", "/ricevuta"],
  ["guida", "/guida"],
  ["impostazioni", "/impostazioni"],
  ["health", "/health"],
  ["portfolio", "/portfolio"],
];

const findings = [];

function record(blocking, page, theme, kind, message) {
  findings.push({ blocking, page, theme, kind, message });
  console.log(`${blocking ? "❌" : "⚠️ "} ${page} [${theme}] ${message}`);
}

async function login(page) {
  await page.goto(BASE_URL + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Testo effettivamente visibile con contrasto sotto 3:1. E' una stima: il
 * colore di sfondo viene cercato risalendo gli antenati, gli sfondi con
 * trasparenza vengono saltati e i gradienti non sono valutati. Per questo
 * produce avvisi e non errori.
 */
const CONTRAST_PROBE = `(() => {
  const parse = (value) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(value || "");
    if (!m) return null;
    const parts = m[1].split(",").map((p) => p.trim());
    const [r, g, b] = parts.slice(0, 3).map(Number);
    const a = parts.length > 3 ? Number(parts[3]) : 1;
    return { r, g, b, a };
  };
  const luminance = ({ r, g, b }) => {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const background = (node) => {
    let el = node;
    while (el) {
      const bg = parse(getComputedStyle(el).backgroundColor);
      if (bg && bg.a >= 0.95) return bg;
      el = el.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const out = [];
  for (const el of document.querySelectorAll("main *")) {
    if (!el.childNodes.length) continue;
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (text.length < 2) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    const color = parse(style.color);
    if (!color || color.a < 0.95) continue;
    const value = ratio(color, background(el));
    // Soglia unica e prudente (3:1): sotto questo valore il testo e'
    // illeggibile anche per chi vede bene. Il limite AA completo (4.5:1)
    // produrrebbe molti casi limite di design, non regressioni.
    if (value < 3) out.push({ text: text.slice(0, 60), ratio: Number(value.toFixed(2)) });
  }
  return out;
})()`;

const browser = await chromium.launch();
try {
  const contexts = [{ label: "desktop", width: 1280, height: 800, mobile: false }];
  if (withMobile) contexts.push({ label: "mobile", width: 390, height: 844, mobile: true });

  for (const viewport of contexts) {
    for (const theme of themes) {
      const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      // next-themes legge la preferenza da localStorage prima del render.
      await ctx.addInitScript((value) => {
        try {
          localStorage.setItem("theme", value);
        } catch {
          /* storage non disponibile: il controllo del tema lo segnala */
        }
      }, theme);

      const page = await ctx.newPage();
      const consoleIssues = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          consoleIssues.push(`${msg.type()}: ${msg.text()}`);
        }
      });
      page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));
      page.on("response", (response) => {
        const url = response.url();
        const status = response.status();
        if (!url.includes("/api/")) return;
        if (status === 401 || status === 403 || status >= 500) {
          consoleIssues.push(`HTTP ${status} ${url.replace(BASE_URL, "")}`);
        }
      });

      try {
        await login(page);
      } catch (error) {
        record(true, "/login", theme, "login", `accesso non riuscito: ${error.message}`);
        await ctx.close();
        continue;
      }

      for (const [name, route] of PAGES) {
        consoleIssues.length = 0;
        try {
          await page.goto(BASE_URL + route, { waitUntil: "domcontentloaded", timeout: 30000 });
          if (page.url().includes("/login")) throw new Error("la pagina ha reindirizzato al login");
          await page.locator("main").first().waitFor({ state: "visible", timeout: 15000 });
          // Lascia partire le fetch lato client (dati, notifiche, verifica in coda).
          await page.waitForTimeout(1200);

          const applied = await page.evaluate((value) => document.documentElement.classList.contains(value), theme);
          if (!applied) record(true, name, theme, "tema", `il tema ${theme} non e' stato applicato`);

          const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return doc.scrollWidth - doc.clientWidth;
          });
          if (overflow > 1) {
            record(!viewport.mobile, name, theme, "overflow", `${overflow}px di scorrimento orizzontale a ${viewport.width}px`);
          }

          for (const issue of consoleIssues) {
            record(true, name, theme, "console", issue);
          }

          if (withContrast) {
            const low = await page.evaluate(CONTRAST_PROBE);
            const seen = new Set();
            for (const item of low) {
              const key = `${item.text}|${item.ratio}`;
              if (seen.has(key)) continue;
              seen.add(key);
              record(false, name, theme, "contrasto", `${item.ratio}:1 — "${item.text}"`);
            }
          }

          console.log(`✅ ${name} [${theme}/${viewport.label}] ${route}`);
        } catch (error) {
          record(true, name, theme, "pagina", `non verificabile: ${error.message}`);
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

const blocking = findings.filter((f) => f.blocking);
const warnings = findings.filter((f) => !f.blocking);
console.log(
  `\nPagine controllate: ${PAGES.length} x ${themes.length} temi x ${withMobile ? 2 : 1} viewport. ` +
    `${blocking.length} problemi, ${warnings.length} avvisi.`
);
if (blocking.length > 0) {
  console.error(`\nProblemi bloccanti:\n  ${blocking.map((f) => `${f.page} [${f.theme}] ${f.message}`).join("\n  ")}`);
  process.exit(1);
}
