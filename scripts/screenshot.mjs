// scripts/screenshot.mjs — screenshot reali di Lead Machine con Playwright.
// Uso:
//   1. npm run setup:screenshot   (una tantum, ~300MB Chromium)
//   2. APP_PASSWORD=... npm start (in un altro terminale, porta 3000)
//   3. APP_PASSWORD=... node scripts/screenshot.mjs [baseUrl]
// Output: screenshots/*.png (desktop 1280x800 + mobile 390x844)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const base = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";
const password = process.env.APP_PASSWORD || "";
const pages = [
  ["dashboard", "/dashboard"],
  ["ricerca", "/ricerca"],
  ["crm", "/crm"],
  ["mappa", "/mappa"],
  ["ricevuta", "/ricevuta"],
  ["impostazioni", "/impostazioni"],
];

async function login(page) {
  if (!password) {
    console.log("⚠️  APP_PASSWORD non impostata: le pagine protette risponderanno 503.");
    return;
  }
  await page.goto(base + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("domcontentloaded");
}

const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [
    { w: 1280, h: 800, suffix: "desktop" },
    { w: 390, h: 844, suffix: "mobile" },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: viewport.w, height: viewport.h } });
    const page = await ctx.newPage();
    await login(page);
    for (const [name, route] of pages) {
      const url = base + route;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (page.url().includes("/login")) {
          throw new Error("sessione non valida: la pagina ha reindirizzato al login");
        }
        await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
        await page.waitForTimeout(2500);
        const file = path.join(outDir, `${name}-${viewport.suffix}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(`✅ ${file}`);
      } catch (e) {
        failures += 1;
        console.log(`❌ ${url}: ${e.message}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} screenshot non riusciti.`);
  process.exitCode = 1;
}
console.log("Fatto. Vedi cartella screenshots/");
