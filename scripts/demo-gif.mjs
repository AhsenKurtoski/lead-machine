// scripts/demo-gif.mjs — registra una passeggiata del prodotto e genera il GIF demo.
// Uso:
//   1. build + server avviato (es. npm run build && npm start -- -p 3111)
//   2. node scripts/demo-gif.mjs http://localhost:3111
// Output: docs/assets/lead-machine-demo.gif (+ .webm sorgente in /tmp)
// Requisito: ffmpeg nel PATH.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "docs", "assets");
fs.mkdirSync(outDir, { recursive: true });

const base = process.argv[2] || process.env.BASE_URL || "http://localhost:3111";
const videoDir = fs.mkdtempSync(path.join(here, "..", ".demo-video-"));
const gifPath = path.join(outDir, "lead-machine-demo.gif");

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();

  const tour = [
    ["/dashboard", 3200],
    ["/ricerca", 3000],
    ["/crm", 3000],
    ["/mappa", 3200],
    ["/preventivi", 3000],
    ["/impostazioni", 2600],
  ];
  for (const [route, pause] of tour) {
    await page.goto(base + route, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1200);
    // scroll morbido per mostrare il contenuto
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(pause - 1200 > 0 ? pause - 1200 : 800);
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(600);
  }
  await ctx.close();
} finally {
  await browser.close();
}

const webm = fs.readdirSync(videoDir).find((f) => f.endsWith(".webm"));
if (!webm) throw new Error("nessun video registrato");
const src = path.join(videoDir, webm);
const palette = path.join(videoDir, "palette.png");

// 20s, 12fps, 960px — GIF leggero e nitido
execFileSync("ffmpeg", ["-y", "-t", "20", "-i", src, "-vf", "fps=12,scale=960:-1:flags=lanczos,palettegen", palette], { stdio: "ignore" });
execFileSync("ffmpeg", ["-y", "-t", "20", "-i", src, "-i", palette, "-lavfi", "fps=12,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse", gifPath], { stdio: "ignore" });

const mb = (fs.statSync(gifPath).size / 1024 / 1024).toFixed(1);
console.log(`✅ ${gifPath} (${mb} MB)`);
fs.rmSync(videoDir, { recursive: true, force: true });
