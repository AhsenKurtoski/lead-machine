// ============================================================
// Rate limiter per client, usato dalle route interne.
//
// Il contatore vive nel database applicativo (src/lib/rate-limit-store.ts),
// quindi vale per tutte le istanze e per tutti gli isolate di Cloudflare.
// Se il database non risponde si ripiega per 30 secondi su un contatore in
// memoria: meglio di un 500 sul login, ma più debole, quindi non va
// considerato una difesa contro un attacco distribuito.
// ============================================================
import { hitSharedRateLimitSafely } from "@/lib/rate-limit-store";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let cleanupTick = 0;

function cleanup() {
  // Non scansionare l'intera mappa a ogni richiesta: con molte chiavi
  // diventerebbe un costo O(n) per ogni chiamata. Ogni 100 richieste basta.
  cleanupTick = (cleanupTick + 1) % 100;
  if (cleanupTick !== 0) return;
  const now = Date.now();
  for (const [key, b] of buckets.entries()) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

// Limita a `max` richieste ogni `windowMs` millisecondi per chiave.
// Ritorna true se la richiesta è bloccata (too many).
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { blocked: boolean; remaining: number; resetAfterMs: number } {
  cleanup();
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const remaining = Math.max(0, max - bucket.count);
  const blocked = bucket.count > max;
  const resetAfterMs = Math.max(0, bucket.resetAt - now);
  return { blocked, remaining, resetAfterMs };
}

// Estrae un identificatore di client ragionevole dalla richiesta
// (combinazione di IP + user-agent se disponibili).
export function clientFingerprint(req: Request, suffix = ""): string {
  const headers = req.headers;
  // X-Forwarded-For e' controllabile dal client: va usato solo dietro un
  // reverse proxy fidato che lo sovrascrive. In locale tutti condividono un
  // bucket, che per un'app single-user va benissimo.
  const trustProxy = (process.env.TRUST_PROXY || "").trim() === "1";
  // Su Workers il runtime e' Cloudflare: CF-Connecting-IP viene sovrascritto
  // ad ogni richiesta, quindi il client non puo' falsificarlo. Senza questo
  // tutti gli utenti condividerebbero il bucket "local" e un singolo
  // attaccante bloccherebbe il proprietario.
  const onCloudflare =
    process.env.CLOUDFLARE_WORKERS === "1" || process.env.DATABASE_PROVIDER === "d1";
  const cfIp = onCloudflare ? headers.get("cf-connecting-ip")?.trim() || "" : "";
  const ip = cfIp
    ? cfIp
    : trustProxy
      ? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        "unknown"
      : "local";
  const ua = headers.get("user-agent") || "";
  let h = 0;
  const s = ip + "|" + ua + "|" + suffix;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "rl:" + (h >>> 0).toString(36);
}

export async function rateLimitedResponse(
  req: Request,
  scope: string,
  max: number,
  windowMs: number
): Promise<Response | null> {
  const fp = clientFingerprint(req, scope);
  const r =
    (await hitSharedRateLimitSafely(fp, max, windowMs)) ?? checkRateLimit(fp, max, windowMs);
  if (!r.blocked) return null;
  const seconds = Math.ceil(r.resetAfterMs / 1000);
  return new Response(
    JSON.stringify({ ok: false, error: `Too many requests. Please wait ${seconds}s and retry.` }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(seconds),
      },
    }
  );
}

// ============================================================
// Sanitizzazione input: validatori e filtri comuni.
// ============================================================

export function asString(v: unknown, max = 10_000): string | null {
  if (v == null) return null;
  const s = String(v);
  if (s.length > max) return s.slice(0, max);
  return s;
}

export function asNonEmptyString(v: unknown, max = 10_000): string | null {
  const s = asString(v, max);
  if (!s) return null;
  const t = s.trim();
  return t ? t : null;
}

export function asInt(v: unknown, min?: number, max?: number): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (min != null && i < min) return null;
  if (max != null && i > max) return null;
  return i;
}

export function asNumber(v: unknown, min?: number, max?: number): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

export function asBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on", "si", "sì"].includes(s)) return true;
    if (["0", "false", "no", "off"].includes(s)) return false;
  }
  return null;
}

export function asArray(v: unknown, maxLen = 500): unknown[] | null {
  if (Array.isArray(v)) return v.length > maxLen ? v.slice(0, maxLen) : v;
  return null;
}

export function isValidEmail(v: unknown): boolean {
  const s = asString(v, 254);
  if (!s) return false;
  // RFC 5322 semplificato, sufficiente per UI/validazione base.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export function isLikelyUrl(v: unknown): boolean {
  const s = asString(v, 2048);
  if (!s) return false;
  try {
    const u = new URL(s.startsWith("http") ? s : "https://" + s);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

export function normalizeUrl(v: string): string {
  const s = v.trim();
  if (!s) return "";
  if (/^[a-z]+:\/\//i.test(s)) return s;
  return "https://" + s;
}

export function sanitizePlainText(v: unknown, max = 20_000): string {
  const s = asString(v, max) || "";
  // Rimuove caratteri di controllo pericolosi (mantiene newline/tab).
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
