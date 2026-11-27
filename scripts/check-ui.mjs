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
//   --mobile                  aggiunge il giro a 390x844 (stessi controlli,
//                             overflow orizzontale compreso)
//   --contrast                aggiunge il controllo del contrasto del testo
//                             (solo avvisi: e' una stima, non un audit WCAG)
//   --no-axe                  salta l'audit di accessibilita' (axe-core)
//
// Accessibilita': axe-core gira su ogni pagina con le regole WCAG 2.0/2.1 A e
// AA. Le violazioni gravi e critiche bloccano il controllo, le altre restano
// avvisi. E' un audit automatico: non sostituisce una revisione a mano.
//
// Esce con codice 1 se trova un problema bloccante. Gli avvisi non fanno
// fallire il controllo: sono cose da guardare, non regressioni certe.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || process.env.SMOKE_BASE || "http://127.0.0.1:3111").replace(/\/$/, "");
const password = process.env.APP_PASSWORD || process.env.SMOKE_PASSWORD || "";
const args = new Set(process.argv.slice(2));
const themeArg = [...args].find((a) => a.startsWith("--theme="))?.split("=")[1] || "both";
const themes = themeArg === "both" ? ["light", "dark"] : [themeArg];
const withMobile = args.has("--mobile");
const withContrast = args.has("--contrast");
const withAxe = !args.has("--no-axe");

// axe-core arriva dalle devDependencies: se manca, il controllo lo dice e
// continua con il resto invece di fallire per un pacchetto assente.
const axePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "axe-core",
  "axe.min.js"
);
const axeSource = withAxe && fs.existsSync(axePath) ? fs.readFileSync(axePath, "utf8") : "";
if (withAxe && !axeSource) {
  console.warn("axe-core non installato: audit di accessibilita' saltato (npm ci lo include).");
}

if (!password) {
  console.error("APP_PASSWORD non impostata: il controllo deve partire da una sessione autenticata.");
  process.exit(1);
}

// Pagine autenticate dell'app. La scheda di un lead (/crm/{id}) non ha un URL
// fisso: viene aggiunta a runtime con il primo lead del seed (o con un lead
// temporaneo, cancellato alla fine). /ricevuta/{id} resta coperta dagli smoke
// test delle API.
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

// La scheda di un lead (/crm/{id}) non e' un URL fisso: serve un record.
// Usa il primo lead del seed (la CI esegue `npm run setup`) e, se il database
// e' vuoto, ne crea uno temporaneo con il marker degli smoke test, cancellato
// alla fine. Senza questo la scheda e il suo pannello non verrebbero mai
// controllati, ne' a desktop ne' a 390 px.
const pages = [...PAGES];
let createdLeadId = null;
const prep = await browser.newContext();
let prepPage = null;
try {
  prepPage = await prep.newPage();
  await login(prepPage);
  // Le API si chiamano dalla pagina autenticata: stesso cookie di sessione e
  // stessa origine del browser vero (l'API rifiuta le mutazioni cross-origin).
  const readLeads = async () => {
    const result = await prepPage.evaluate(async () => {
      const res = await fetch("/api/leads");
      return { status: res.status, body: await res.json().catch(() => ({})) };
    });
    if (result.status !== 200) throw new Error(`GET /api/leads: HTTP ${result.status}`);
    return result.body.leads || [];
  };
  let leadId = (await readLeads())[0]?.id ?? null;
  if (!leadId) {
    const name = "Smoke Test check:ui " + Date.now();
    const result = await prepPage.evaluate(async (payload) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: [payload] }),
      });
      return { status: res.status };
    }, { name, city: "Belluno", source: "check-ui" });
    if (result.status !== 200) throw new Error(`POST /api/leads: HTTP ${result.status}`);
    leadId = (await readLeads()).find((lead) => lead.name === name)?.id ?? null;
    createdLeadId = leadId;
  }
  if (!leadId) throw new Error("nessun lead disponibile per /crm/{id}");
  pages.push(["scheda-lead", "/crm/" + leadId]);
} catch (error) {
  record(true, "scheda-lead", "-", "seed", `impossibile preparare il lead: ${error.message}`);
}

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

      for (const [name, route] of pages) {
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
            // Bloccante anche a 390 px: lo scorrimento orizzontale della
            // pagina non e' un dettaglio estetico, sposta i contenuti fuori
            // dallo schermo. Il caso scoperto qui era /crm (235 px).
            record(true, name, theme, "overflow", `${overflow}px di scorrimento orizzontale a ${viewport.width}px`);
          }

          // La scheda lead deve mostrare il pannello "Dati verificati" intero:
          // il controllo generico dell'overflow non vede un contenuto tagliato
          // da un contenitore che lo nasconde. Verifica che la card sia nel
          // viewport e che non abbia scorrimento orizzontale interno.
          if (name === "scheda-lead") {
            const panel = await page.evaluate(() => {
              const button = [...document.querySelectorAll("button")].find((b) =>
                /Verifica ora/i.test(b.textContent || "")
              );
              if (!button) return { missing: true };
              let card = button;
              while (card && card !== document.body) {
                if (card.tagName === "DIV" && /rounded-xl/.test(String(card.className))) break;
                card = card.parentElement;
              }
              if (!card) return { missing: true };
              const rect = card.getBoundingClientRect();
              return {
                missing: false,
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                viewport: window.innerWidth,
                scrollWidth: card.scrollWidth,
                clientWidth: card.clientWidth,
              };
            });
            if (panel.missing) {
              record(true, name, theme, "pannello", 'pannello "Dati verificati" non trovato');
            } else {
              if (panel.left < -1 || panel.right > panel.viewport + 1) {
                record(
                  true,
                  name,
                  theme,
                  "pannello",
                  `pannello fuori dal viewport (${panel.left}-${panel.right} su ${panel.viewport} px)`
                );
              }
              if (panel.scrollWidth > panel.clientWidth + 1) {
                record(
                  true,
                  name,
                  theme,
                  "pannello",
                  `contenuto del pannello tagliato (${panel.scrollWidth}px in ${panel.clientWidth}px)`
                );
              }
            }
          }

          for (const issue of consoleIssues) {
            record(true, name, theme, "console", issue);
          }

          if (axeSource) {
            await page.addScriptTag({ content: axeSource });
            const violations = await page.evaluate(async () => {
              const result = await window.axe.run(document, {
                runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
              });
              return result.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                nodes: v.nodes.length,
                help: v.help,
              }));
            });
            for (const v of violations) {
              record(
                v.impact === "critical" || v.impact === "serious",
                name,
                theme,
                "a11y",
                `${v.id} (${v.impact}, ${v.nodes} nod${v.nodes === 1 ? "o" : "i"}): ${v.help}`
              );
            }
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
  if (createdLeadId && prepPage) {
    try {
      const status = await prepPage.evaluate(async (id) => {
        const res = await fetch("/api/leads/" + id, { method: "DELETE" });
        return res.status;
      }, createdLeadId);
      if (status === 200) {
        console.log(`🧹 lead temporaneo ${createdLeadId} cancellato`);
      } else {
        record(true, "scheda-lead", "-", "pulizia", `lead temporaneo non cancellato (HTTP ${status})`);
      }
    } catch (error) {
      record(true, "scheda-lead", "-", "pulizia", `lead temporaneo non cancellato: ${error.message}`);
    }
  }
  await prep.close();
  await browser.close();
}

const blocking = findings.filter((f) => f.blocking);
const warnings = findings.filter((f) => !f.blocking);
console.log(
  `\nPagine controllate: ${pages.length} x ${themes.length} temi x ${withMobile ? 2 : 1} viewport. ` +
    `${blocking.length} problemi, ${warnings.length} avvisi.`
);
if (blocking.length > 0) {
  console.error(`\nProblemi bloccanti:\n  ${blocking.map((f) => `${f.page} [${f.theme}] ${f.message}`).join("\n  ")}`);
  process.exit(1);
}
