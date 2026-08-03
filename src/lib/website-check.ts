// ============================================================
// Arricchimento dati: verifica lo stato REALE del sito di un lead.
// Esegue una richiesta HTTP, misura il tempo di risposta e cerca
// indizi di ottimizzazione mobile. Solo lato server.
// ============================================================

export type WebsiteCheck = {
  status: "assente" | "ok" | "lento" | "vecchio" | "non_responsive";
  reachable: boolean;
  httpStatus: number | null;
  responseMs: number | null;
  responsive: boolean | null;
  detail: string;
};

export async function checkWebsite(rawUrl: string | null): Promise<WebsiteCheck> {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      status: "assente",
      reachable: false,
      httpStatus: null,
      responseMs: null,
      responsive: null,
      detail: "Nessun sito web indicato.",
    };
  }

  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "LeadMachineBot/1.0 (verifica stato sito)" },
    });
    const responseMs = Date.now() - started;

    if (!res.ok) {
      return {
        status: "non_responsive",
        reachable: false,
        httpStatus: res.status,
        responseMs,
        responsive: null,
        detail: "Il sito risponde con errore HTTP " + res.status + ".",
      };
    }

    let html = "";
    try {
      html = await res.text();
    } catch {
      html = "";
    }
    const responsive = /<meta[^>]+name=["']?viewport/i.test(html);

    if (responseMs > 3500) {
      return {
        status: "lento",
        reachable: true,
        httpStatus: res.status,
        responseMs,
        responsive,
        detail: "Il sito e raggiungibile ma lento (" + responseMs + " ms).",
      };
    }
    if (!responsive) {
      return {
        status: "vecchio",
        reachable: true,
        httpStatus: res.status,
        responseMs,
        responsive,
        detail: "Il sito e raggiungibile ma non sembra ottimizzato per mobile (manca il meta viewport).",
      };
    }
    return {
      status: "ok",
      reachable: true,
      httpStatus: res.status,
      responseMs,
      responsive,
      detail: "Il sito e raggiungibile, veloce e ottimizzato per mobile (" + responseMs + " ms).",
    };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    const msg = aborted ? "timeout" : e instanceof Error ? e.message : String(e);
    return {
      status: "non_responsive",
      reachable: false,
      httpStatus: null,
      responseMs: null,
      responsive: null,
      detail: "Impossibile raggiungere il sito (" + msg + ").",
    };
  } finally {
    clearTimeout(timer);
  }
}
