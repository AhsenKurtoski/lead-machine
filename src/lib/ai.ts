// ============================================================
// Client AI condiviso - rotazione e failover tra piu provider.
// Le chiavi vengono lette PRIMA dalle Impostazioni (database),
// POI dalle variabili d'ambiente (.env) come ripiego.
// Cosi puoi configurare tutto dalla pagina Impostazioni, senza
// dover riavviare il server o toccare il file .env.
// Se un provider fallisce o esaurisce la quota (es. 429),
// si passa AUTOMATICAMENTE al provider successivo.
// ============================================================

import { getSettings } from "@/lib/settings";

export type AiProvider = "gemini" | "groq";

export type AiResult = { text: string; provider: AiProvider };

export type AiConfig = {
  geminiKey: string;
  groqKey: string;
  geminiModel: string;
  groqModel: string;
  order: AiProvider[];
};

const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

function clean(v: string | undefined | null): string {
  // Rimuove spazi e eventuali virgolette incollate per errore.
  return (v ?? "").trim().replace(/^[\"']|[\"']$/g, "").trim();
}

function parseOrder(raw: string): AiProvider[] {
  const parsed = raw
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s === "gemini" || s === "groq") as AiProvider[];
  const unique = Array.from(new Set(parsed));
  return unique.length ? unique : ["gemini", "groq"];
}

// Legge la configurazione AI: prima dal database (Impostazioni), poi dal .env.
export async function getAiConfig(): Promise<AiConfig> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    s = {};
  }
  const geminiKey = clean(s.gemini_api_key) || clean(process.env.GEMINI_API_KEY);
  const groqKey = clean(s.groq_api_key) || clean(process.env.GROQ_API_KEY);
  const geminiModel =
    clean(s.gemini_model) || clean(process.env.GEMINI_MODEL) || GEMINI_DEFAULT_MODEL;
  const groqModel =
    clean(s.groq_model) || clean(process.env.GROQ_MODEL) || GROQ_DEFAULT_MODEL;
  const orderRaw = clean(s.ai_order) || clean(process.env.AI_ORDER) || "gemini,groq";
  return { geminiKey, groqKey, geminiModel, groqModel, order: parseOrder(orderRaw) };
}

export function configHasKey(cfg: AiConfig, p: AiProvider): boolean {
  return p === "gemini" ? Boolean(cfg.geminiKey) : Boolean(cfg.groqKey);
}

// true se almeno un provider ha la chiave configurata (DB o .env).
export async function aiConfigured(): Promise<boolean> {
  const cfg = await getAiConfig();
  return cfg.order.some((p) => configHasKey(cfg, p));
}

// true se la chiave Gemini e disponibile (serve per la ricerca su Google).
export async function hasGeminiKey(): Promise<boolean> {
  const cfg = await getAiConfig();
  return Boolean(cfg.geminiKey);
}

// Riepilogo non sensibile dello stato delle chiavi (per la diagnostica).
export async function aiStatus(): Promise<{
  gemini: boolean;
  groq: boolean;
  geminiSource: string;
  groqSource: string;
  order: AiProvider[];
}> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    s = {};
  }
  const cfg = await getAiConfig();
  return {
    gemini: Boolean(cfg.geminiKey),
    groq: Boolean(cfg.groqKey),
    geminiSource: clean(s.gemini_api_key)
      ? "impostazioni"
      : clean(process.env.GEMINI_API_KEY)
        ? ".env"
        : "nessuna",
    groqSource: clean(s.groq_api_key)
      ? "impostazioni"
      : clean(process.env.GROQ_API_KEY)
        ? ".env"
        : "nessuna",
    order: cfg.order,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Traduce gli errori HTTP dei provider in messaggi chiari in italiano.
function describeHttpError(provider: string, status: number, detail: string): string {
  if (status === 429) {
    return (
      provider +
      ": limite gratuito raggiunto (quota giornaliera o troppe richieste al minuto). " +
      "Aspetta circa 1 minuto e riprova, oppure aggiungi una seconda chiave gratuita come riserva (Groq)."
    );
  }
  if (status === 401 || status === 403) {
    return provider + ": chiave non valida o non autorizzata. Controlla la chiave nelle Impostazioni.";
  }
  if (status === 503 || status === 500) {
    return provider + ": servizio momentaneamente sovraccarico. Riprova tra poco.";
  }
  return provider + " HTTP " + status + (detail ? " - " + detail.slice(0, 200) : "");
}

type CallOpts = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  useSearch?: boolean;
};

async function callGemini(cfg: AiConfig, opts: CallOpts): Promise<string> {
  if (!cfg.geminiKey) throw new Error("GEMINI_API_KEY mancante");
  const model = cfg.geminiModel || GEMINI_DEFAULT_MODEL;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(cfg.geminiKey);

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 1024,
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  // Grounding con Google Search (solo Gemini): permette di cercare sul web.
  if (opts.useSearch) body.tools = [{ google_search: {} }];

  let lastErr = "";
  for (let attempt = 0; attempt <= 1; attempt++) {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      50000,
    );
    if (res.ok) {
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.map((part: { text?: string }) => part?.text ?? "").join("")
        : "";
      return (text || "").trim();
    }
    const detail = await res.text().catch(() => "");
    lastErr = describeHttpError("Gemini", res.status, detail);
    // Riprova una sola volta per errori transitori (sovraccarico o burst al minuto).
    if ((res.status === 429 || res.status === 503 || res.status === 500) && attempt < 1) {
      await sleep(1500);
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr || "Gemini: errore sconosciuto");
}

async function callGroq(cfg: AiConfig, opts: CallOpts): Promise<string> {
  if (!cfg.groqKey) throw new Error("GROQ_API_KEY mancante");
  const model = cfg.groqModel || GROQ_DEFAULT_MODEL;
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  let lastErr = "";
  for (let attempt = 0; attempt <= 1; attempt++) {
    const res = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + cfg.groqKey,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 1024,
        }),
      },
      50000,
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? "";
      return String(text).trim();
    }
    const detail = await res.text().catch(() => "");
    lastErr = describeHttpError("Groq", res.status, detail);
    if ((res.status === 429 || res.status === 503 || res.status === 500) && attempt < 1) {
      await sleep(1500);
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr || "Groq: errore sconosciuto");
}

// Genera testo provando i provider in ordine, con failover automatico.
// Lancia Error("NO_AI_KEYS") se nessuna chiave e configurata.
export async function generateText(opts: CallOpts): Promise<AiResult> {
  const cfg = await getAiConfig();
  const errors: string[] = [];
  let anyKey = false;
  for (const p of cfg.order) {
    if (!configHasKey(cfg, p)) continue;
    anyKey = true;
    try {
      const text =
        p === "gemini" ? await callGemini(cfg, opts) : await callGroq(cfg, opts);
      if (text) return { text, provider: p };
      errors.push(p + ": risposta vuota");
    } catch (e) {
      errors.push(p + ": " + (e instanceof Error ? e.message : String(e)));
      // continua con il provider successivo (failover)
    }
  }
  if (!anyKey) throw new Error("NO_AI_KEYS");
  throw new Error(errors.join(" | "));
}

// Genera testo con ricerca su Google (solo Gemini supporta il grounding).
// Lancia Error("NO_GEMINI_KEY") se manca la chiave Gemini.
export async function generateWithSearch(opts: CallOpts): Promise<AiResult> {
  const cfg = await getAiConfig();
  // Tentativo principale: Gemini con grounding Google Search (piu preciso e aggiornato).
  if (cfg.geminiKey) {
    try {
      const text = await callGemini(cfg, {
        ...opts,
        useSearch: true,
        temperature: opts.temperature ?? 0.2,
      });
      if (text) return { text, provider: "gemini" };
    } catch (e) {
      // Se non c'e nessuna riserva configurata, propaga l'errore (gia in italiano).
      if (!cfg.groqKey) throw e;
      // Altrimenti prosegui con il fallback non-grounded qui sotto.
    }
  } else if (!cfg.groqKey) {
    throw new Error("NO_AI_KEYS");
  }
  // Fallback senza ricerca Google (Gemini/Groq): meno preciso ma evita i blocchi da quota.
  return generateText({ ...opts, temperature: opts.temperature ?? 0.2 });
}
