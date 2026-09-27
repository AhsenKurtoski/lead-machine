// scripts/screenshot.mjs — screenshot reali di Lead Machine con Playwright.
// Uso:
//   1. npm run setup:screenshot   (una tantum, ~300MB Chromium)
//   2. npm run dev                (in un altro terminale, porta 3000)
//   3. node scripts/screenshot.mjs [baseUrl]
// Output: screenshots/*.png (desktop 1280x800 + mobile 390x844)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const base = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";
const pages = [
  ["dashboard", "/dashboard"],
  ["ricerca", "/ricerca"],
  ["crm", "/crm"],
  ["mappa", "/mappa"],
  ["preventivi", "/preventivi"],
  ["impostazioni", "/impostazioni"],
];

const browser = await chromium.launch();
try {
  for (const viewport of [
    { w: 1280, h: 800, suffix: "desktop" },
    { w: 390, h: 844, suffix: "mobile" },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: viewport.w, height: viewport.h } });
    const page = await ctx.newPage();
    for (const [name, route] of pages) {
      const url = base + route;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(1500);
        const file = path.join(outDir, `${name}-${viewport.suffix}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(`✅ ${file}`);
      } catch (e) {
        console.log(`❌ ${url}: ${e.message}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log("Fatto. Vedi cartella screenshots/");
