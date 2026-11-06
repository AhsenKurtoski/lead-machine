// scripts/demo-gif.mjs — registra una passeggiata REALE del prodotto e genera
// il video MP4 + il GIF usato dal README.
//
// Uso:
//   1. npm run build && APP_PASSWORD=... PORT=3111 npm start
//   2. APP_PASSWORD=... node scripts/demo-gif.mjs [baseUrl]
// Output:
//   docs/assets/lead-machine-demo.mp4
//   docs/assets/lead-machine-demo.gif
// Opzionale:
//   DEMO_DESKTOP_DIR=C:/Users/... copia l'MP4 anche sul Desktop.
//
// Requisiti: Playwright/Chromium (npm run setup:screenshot) e ffmpeg nel PATH.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "docs", "assets");
fs.mkdirSync(outDir, { recursive: true });

const base = process.argv[2] || process.env.BASE_URL || "http://localhost:3111";
const password = process.env.APP_PASSWORD || process.env.DEMO_PASSWORD || "";
if (!password) {
  console.error("APP_PASSWORD non impostata: il video deve partire da una sessione autenticata.");
  process.exit(1);
}

const videoDir = fs.mkdtempSync(path.join(here, "..", ".demo-video-"));
const gifPath = path.join(outDir, "lead-machine-demo.gif");
const mp4Path = path.join(outDir, "lead-machine-demo.mp4");

async function login(page) {
  await page.goto(base + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("domcontentloaded");
}

async function main() {
  // Login in un contesto non registrato: il video non mostra la password.
  const authBrowser = await chromium.launch();
  let storageState;
  try {
    const ctx = await authBrowser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page);
    storageState = await ctx.storageState();
    if (!storageState.cookies.length) throw new Error("Login riuscito ma nessun cookie salvato.");
  } finally {
    await authBrowser.close();
  }

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState,
      recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const tour = [
      ["/dashboard", 3200],
      ["/ricerca", 2400],
      ["/crm", 2800],
      ["/mappa", 3000],
      ["/opportunita", 2400],
      ["/ricevuta", 2400],
      ["/health", 2400],
    ];

    for (const [route, pause] of tour) {
      await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (page.url().includes("/login")) {
        throw new Error(`sessione non valida su ${route}: la pagina ha reindirizzato al login`);
      }
      await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(900);
      await page.mouse.wheel(0, 360);
      await page.waitForTimeout(450);
      await page.mouse.wheel(0, -360);
      await page.waitForTimeout(Math.max(600, pause - 1350));
    }
    await ctx.close();

    const webm = fs.readdirSync(videoDir).find((file) => file.endsWith(".webm"));
    if (!webm) throw new Error("nessun video registrato");
    const src = path.join(videoDir, webm);

    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        src,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        mp4Path,
      ],
      { stdio: "ignore" }
    );

    // GIF leggero per il README: primi 20 secondi, 12fps, 960px.
    const palette = path.join(videoDir, "palette.png");
    execFileSync(
      "ffmpeg",
      ["-y", "-t", "20", "-i", src, "-vf", "fps=12,scale=960:-1:flags=lanczos,palettegen", palette],
      { stdio: "ignore" }
    );
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-t",
        "20",
        "-i",
        src,
        "-i",
        palette,
        "-lavfi",
        "fps=12,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse",
        gifPath,
      ],
      { stdio: "ignore" }
    );

    const mb = (file) => (fs.statSync(file).size / 1024 / 1024).toFixed(1);
    console.log(`✅ ${mp4Path} (${mb(mp4Path)} MB)`);
    console.log(`✅ ${gifPath} (${mb(gifPath)} MB)`);

    if (consoleErrors.length) {
      console.log(`⚠️  ${consoleErrors.length} errori console durante il tour:`);
      for (const error of [...new Set(consoleErrors)].slice(0, 10)) console.log(`   ${error}`);
    }

    const desktopDir = process.env.DEMO_DESKTOP_DIR;
    if (desktopDir) {
      fs.mkdirSync(desktopDir, { recursive: true });
      const target = path.join(desktopDir, "Lead-Machine-Demo.mp4");
      fs.copyFileSync(mp4Path, target);
      console.log(`✅ Copiato su ${target}`);
    }
  } finally {
    await browser.close();
    fs.rmSync(videoDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Errore nella generazione del video: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
