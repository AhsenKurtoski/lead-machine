import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};
export const corsHeaders = CORS_HEADERS;

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

export function generateRawApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  // Formato: lm_live_<32 bytes hex>
  const token = randomBytes(24).toString("hex");
  const rawKey = `lm_live_${token}`;
  const keyPrefix = rawKey.slice(0, 16) + "...";
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export function generateApiKey(_name?: string): { rawKey: string; keyPrefix: string; keyHash: string } {
  return generateRawApiKey();
}

// Applica un budget di tempo massimo a una promise: se scade, si rifiuta
// con un errore leggibile invece di lasciare la richiesta appesa per minuti.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(label + ": tempo scaduto dopo " + Math.round(ms / 1000) + "s"));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ============================================================
// Scope (permessi) delle API key.
// Ogni endpoint /api/v1/* richiede uno scope preciso: il permesso
// dichiarato sulla chiave viene APPLICATO davvero, non solo salvato.
// ============================================================

export const API_SCOPES = ["read", "write", "search", "ai"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

// Profili professionali predefiniti (usati anche dalla UI).
export const SCOPE_PRESETS: { id: string; scopes: ApiScope[]; all?: boolean }[] = [
  { id: "full", scopes: ["read", "write", "search", "ai"], all: true },
  { id: "search", scopes: ["read", "search"] },
  { id: "readonly", scopes: ["read"] },
  { id: "writeonly", scopes: ["write"] },
];

// Normalizza una stringa di permessi in un elenco di scope validi.
// Accetta anche "*" e "admin" come sinonimi di accesso completo.
export function parseScopes(permissions: string | null | undefined): ApiScope[] {
  const raw = (permissions ?? "").toLowerCase().trim();
  if (!raw) return ["read"];
  if (raw === "*" || raw === "all" || raw === "admin") return [...API_SCOPES];
  const set = new Set<ApiScope>();
  for (const part of raw.split(",")) {
    const p = part.trim();
    if ((API_SCOPES as readonly string[]).includes(p)) set.add(p as ApiScope);
    // Compatibilita' con le chiavi storiche "read,write"
    if (p === "*") API_SCOPES.forEach((s) => set.add(s));
  }
  return Array.from(set);
}

// Serializza per il salvataggio: ordine stabile e nessun duplicato.
export function serializeScopes(scopes: ApiScope[]): string {
  return API_SCOPES.filter((s) => scopes.includes(s)).join(",");
}

// Restituisce una risposta 403 se la chiave non ha lo scope richiesto.
export function requireScope(
  scopes: ApiScope[],
  needed: ApiScope
): { ok: true } | { ok: false; response: Response } {
  if (scopes.includes(needed)) return { ok: true };
  const response = new NextResponse(
    JSON.stringify({
      ok: false,
      error:
        "Questa API Key non ha il permesso '" +
        needed +
        "'. Permessi attuali: [" +
        (scopes.length ? scopes.join(", ") : "nessuno") +
        "]. Genera una chiave con il profilo adatto in Impostazioni > API Key.",
      requiredScope: needed,
      currentScopes: scopes,
    }),
    {
      status: 403,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "X-Required-Scope": needed,
      },
    }
  );
  return { ok: false, response };
}

export type AuthResult =
  | { ok: true; apiKey: { id: string; name: string; permissions: string; scopes: ApiScope[] } }
  | { ok: false; error: string; status: number };

export async function validateApiKey(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key") || "";
  let rawToken = "";

  if (authHeader.startsWith("Bearer ")) {
    rawToken = authHeader.slice(7).trim();
  } else {
    rawToken = authHeader.trim();
  }

  if (!rawToken) {
    return {
      ok: false,
      error: "API Key mancante. Fornisci l'header 'x-api-key: lm_live_...' o 'Authorization: Bearer lm_live_...'.",
      status: 401,
    };
  }

  const hash = hashApiKey(rawToken);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
  });

  if (!apiKey) {
    return {
      ok: false,
      error: "API Key non valida o inesistente.",
      status: 401,
    };
  }

  if (!apiKey.enabled) {
    return {
      ok: false,
      error: "API Key disabilitata o revocata.",
      status: 403,
    };
  }

  // Aggiorna asincronamente lastUsedAt senza bloccare la richiesta
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    ok: true,
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      permissions: apiKey.permissions,
      scopes: parseScopes(apiKey.permissions),
    },
  };
}

// ============================================================
// Rate limiting per API key.
// Diversamente dal limiter per IP (src/lib/security.ts), questo
// funziona anche quando la chiave viene usata da server/IP diversi.
// ============================================================

type KeyBucket = { count: number; resetAt: number };
const keyBuckets = new Map<string, KeyBucket>();

function cleanupKeyBuckets() {
  const now = Date.now();
  for (const [k, b] of keyBuckets) {
    if (b.resetAt < now) keyBuckets.delete(k);
  }
}

// Restituisce una risposta 429 se la chiave ha superato il budget, altrimenti null.
export async function rateLimitApiKey(
  apiKeyId: string,
  scope: string,
  max: number,
  windowMs: number
): Promise<Response | null> {
  cleanupKeyBuckets();
  const key = apiKeyId + "|" + scope;
  const now = Date.now();
  let bucket = keyBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    keyBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count <= max) return null;

  const seconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return new NextResponse(
    JSON.stringify({
      ok: false,
      error: `Troppe richieste (${scope}). Attendi ${seconds}s e riprova.`,
    }),
    {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Retry-After": String(seconds),
        "X-RateLimit-Limit": String(max),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
      },
    }
  );
}
