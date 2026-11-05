#!/usr/bin/env node
// ============================================================
// Ogni pagina si DISEGNA davvero? (controllo in un browser vero)
//
// Il server non puo' rispondere a questa domanda: le pagine di Lead Machine
// renderizzano lato client, quindi l'HTML del server contiene solo
// "Caricamento…" per tutte (misurato). Un controllo sull'HTML direbbe "ok" anche
// per una pagina vuota. Qui si apre ogni pagina in Chromium, si aspetta che il
// contenuto ci sia e si guarda cosa e' finito in console.
//
// Fallisce se una pagina:
//   - non risponde 200,
//   - resta vuota (il contenuto dentro #main-content non si popola), oppure
//   - scrive errori in console o solleva un'eccezione.
//
// Uso:
//   npm run check:pages                       (server acceso su :3111)
//   SMOKE_BASE=http://localhost:3000 npm run check:pages
//   PAGES_REPORT=1 npm run check:pages        (stampa le misure, senza fallire)
//
// Richiede Playwright + Chromium (`npm run setup:screenshot`, ~300MB, una
// tantum). Senza, esce con codice 2 spiegando cosa manca: non e' un fallimento
// del progetto, e' un controllo non eseguito.
// ============================================================
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.SMOKE_BASE || process.env.BASE_URL || "http://127.0.0.1:3111";
const REPORT = process.env.PAGES_REPORT === "1";

// Sotto questa soglia di testo visibile dentro #main-content la pagina e'
// considerata vuota. Il minimo reale misurato sulle pagine dell'app e' ~330
// caratteri (la piu' scarna e' /onboarding); una pagina che non disegna nulla
// ne ha 0, e la shell da sola non basta a superare la soglia perche' #main-content
// contiene SOLO il contenuto della pagina.
const MIN_TEXT = 120;

// Attesa massima perche' il contenuto compaia (il render e' lato client).
const CONTENT_TIMEOUT_MS = 15000;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "Playwright non e' installato: questo controllo non viene eseguito.\n" +
      "Installa una volta con: npm run setup:screenshot"
  );
  process.exit(2);
}

// --- Rotte da controllare: le pagine su disco, senza quelle dinamiche -------
const APP = path.resolve("src/app");

function collectPages(dir, segment = "", out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.some((e) => e.name === "page.tsx")) out.push("/" + segment);
  for (const e of entries) {
    if (e.isDirectory()) {
      collectPages(path.join(dir, e.name), segment ? segment + "/" + e.name : e.name, out);
    }
  }
  return out;
}

const routes = collectPages(APP);
const staticRoutes = routes.filter((r) => !r.includes("["));
const dynamicRoutes = routes.filter((r) => r.includes("["));
// La home non e' una pagina da guardare: e' un redirect dichiarato.
const toCheck = [...staticRoutes.filter((r) => r !== "/"), "/"];

const pass = [];
const fail = [];
const skipped = [];

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " -- " + detail : ""}`);
  (ok ? pass : fail).push(name);
}

// Il server risponde? (altrimenti e' inutile aprire un browser)
const ping = await fetch(BASE + "/api/settings").catch(() => null);
if (!ping || !ping.ok) {
  console.error(`Server non raggiungibile su ${BASE}.\nAvvia prima: npm run build && PORT=3111 npm start`);
  process.exit(2);
}

console.log(
  `Controllo pagine in un browser vero su ${BASE}\n` +
    `${toCheck.length} pagine (${dynamicRoutes.length} dinamiche escluse: servono dati reali)\n` +
    `soglia "pagina vuota": meno di ${MIN_TEXT} caratteri in #main-content\n`
);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
// Il riprocessamento della coda di verifica parte all'apertura dell'app: qui non
// serve e intaserebbe il rate limit, quindi si dice alla pagina che e' gia' stato
// fatto in questa "sessione".
await context.addInitScript(() => {
  try {
    window.sessionStorage.setItem("lead-machine-retry-sweep", String(Date.now()));
  } catch {
    /* storage bloccato: la pagina provera' lo sweep, non e' un errore */
  }
});

const page = await context.newPage();
let currentErrors = [];
page.on("console", (msg) => {
  if (msg.type() !== "error") return;
  const text = msg.text();
  // Le risorse che non si caricano (favicon, un 429 della coda) non sono errori
  // della pagina: finiscono a parte, non fanno fallire il controllo.
  if (/Failed to load resource|net::ERR_/i.test(text)) return;
  currentErrors.push(text);
});
page.on("pageerror", (err) => currentErrors.push("eccezione non gestita: " + err.message));

for (const route of toCheck) {
  currentErrors = [];
  const url = BASE + route;
  try {
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    const status = res ? res.status() : 0;

    if (route === "/") {
      check(
        "la home rimanda a /dashboard",
        new URL(page.url()).pathname === "/dashboard",
        page.url().replace(BASE, "")
      );
    } else {
      check(`${route} risponde 200`, status === 200, "status=" + status);
    }

    let text = "";
    try {
      // Il contenuto si popola lato client: si aspetta che compaia.
      await page.waitForFunction(
        (min) => {
          const main = document.querySelector("#main-content") || document.body;
          return (main.innerText || "").trim().length >= min;
        },
        MIN_TEXT,
        { timeout: CONTENT_TIMEOUT_MS }
      );
    } catch {
      // Nessun contenuto entro il tempo: lo misuriamo sotto e lo diciamo.
    }
    await page.waitForTimeout(300);
    text = await page.evaluate(() => {
      const main = document.querySelector("#main-content") || document.body;
      return (main.innerText || "").replace(/\s+/g, " ").trim();
    });

    if (REPORT) {
      console.log(`      ${route} -> ${text.length} caratteri | ${text.slice(0, 60)}`);
    }

    check(
      `${route} non e' una pagina vuota`,
      text.length >= MIN_TEXT,
      text.length >= MIN_TEXT
        ? `${text.length} caratteri dentro #main-content`
        : `solo ${text.length} caratteri: la pagina non disegna nulla`
    );
    check(
      `${route} ha finito di caricare (non resta sul segnaposto)`,
      !/^Caricamento…?$/.test(text),
      text.slice(0, 40)
    );
    check(
      `${route} senza errori in console`,
      currentErrors.length === 0,
      currentErrors.length ? currentErrors.slice(0, 2).join(" | ") : ""
    );
  } catch (err) {
    check(`${route} si apre in un browser`, false, err.message.split("\n")[0]);
  }
}

await browser.close();

const skippedNote = skipped.length ? `, ${skipped.length} saltate` : "";
console.log(`\nTotale: ${pass.length} pass, ${fail.length} fail${skippedNote}`);
if (fail.length) {
  console.log("FALLITI:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log("PAGINE OK — tutte le pagine si disegnano, senza errori in console");
