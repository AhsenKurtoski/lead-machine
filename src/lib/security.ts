// ============================================================
// Rate limiter semplice in-memory per proteggere le route
// da burst di richieste (es. invio email, AI, ricerca).
//
// Nota: essendo in-memory, NON scala su più istanze serverless
// (es. Vercel con più regioni): in quel caso va sostituito
// con Redis/Upstash. Per uso locale / singola istanza va bene.
// ============================================================

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function cleanup() {
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
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown";
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
  const r = checkRateLimit(fp, max, windowMs);
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
