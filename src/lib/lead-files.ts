// File locali collegati a un lead (screenshot del sito).
// Su Cloudflare Workers non esiste un filesystem scrivibile: il dynamic
// import e il try/catch servono a degradare senza bloccare la cancellazione.

/** Rimuove lo screenshot del lead se e solo se sta dentro public/screenshots. */
export async function removeLeadScreenshot(screenshot: string | null | undefined): Promise<boolean> {
  if (!screenshot?.startsWith("/screenshots/")) return false;
  try {
    const { unlink } = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.join(process.cwd(), "public", screenshot);
    const root = path.join(process.cwd(), "public", "screenshots");
    if (!file.startsWith(root + path.sep)) return false;
    await unlink(file);
    return true;
  } catch {
    // File gia assente o non rimovibile: non blocca la cancellazione del lead.
    return false;
  }
}
