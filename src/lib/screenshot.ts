// ============================================================
// Cattura screenshot di un sito web con Playwright (funzione J).
// Modulo OPZIONALE: se Playwright non e installato restituisce un
// errore chiaro, senza mai far crashare l'app. Solo lato server.
// ============================================================
import path from "path";
import { promises as fs } from "fs";
import { assertPublicHttpUrl, isBlockedHostname } from "@/lib/url-safety";

export type ScreenshotResult =
  | { ok: true; publicPath: string }
  | { ok: false; error: string; needsInstall?: boolean };

export async function captureWebsite(rawUrl: string, leadId: string): Promise<ScreenshotResult> {
  let url = (rawUrl || "").trim();
  if (!url) return { ok: false, error: "Il lead non ha un sito web da catturare." };
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    await assertPublicHttpUrl(url);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "URL non consentito." };
  }

  // Import dinamico: nessun errore a build-time se il pacchetto manca.
  let chromium: any;
  try {
    // @ts-ignore - dipendenza opzionale, potrebbe non essere installata
    const pw: any = await import("playwright");
    chromium = pw.chromium;
  } catch {
    return {
      ok: false,
      needsInstall: true,
      error: "Playwright non e installato. Esegui: npm run setup:screenshot",
    };
  }

  const dir = path.join(process.cwd(), "public", "screenshots");
  await fs.mkdir(dir, { recursive: true });
  const fileName = leadId + ".png";
  const filePath = path.join(dir, fileName);

  let browser: any = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    // Blocca navigazioni e sotto-risorse verso host locali/privati, anche
    // quando il sito pubblico reindirizza verso la rete interna.
    await page.route("**/*", async (route: any) => {
      try {
        const raw = route.request().url();
        const parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return route.abort();
        if (isBlockedHostname(parsed.hostname)) return route.abort();
        if (route.request().isNavigationRequest()) await assertPublicHttpUrl(raw);
        return route.continue();
      } catch {
        return route.abort();
      }
    });

    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: filePath, type: "png", fullPage: false });
    return { ok: true, publicPath: "/screenshots/" + fileName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Executable doesn't exist|playwright install|browserType.launch/i.test(msg)) {
      return {
        ok: false,
        needsInstall: true,
        error: "Browser di Playwright non installato. Esegui: npx playwright install chromium",
      };
    }
    return { ok: false, error: "Impossibile catturare lo screenshot: " + msg };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignora errori di chiusura
      }
    }
  }
}
