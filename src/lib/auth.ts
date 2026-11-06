// ============================================================
// Autenticazione locale a password condivisa.
//
// L'app e' pensata per un singolo utente: non ci sono account, ruoli o
// tenant. La protezione minima ma reale e' quindi una password di accesso
// (APP_PASSWORD) e un cookie di sessione firmato con HMAC-SHA256.
//
// Il token non contiene dati personali: e' solo "v1.<scadenza>.<firma>".
// Cambiare APP_PASSWORD invalida tutte le sessioni esistenti.
// ============================================================

export const SESSION_COOKIE = "lm_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 giorni

export function authPassword(): string {
  return (process.env.APP_PASSWORD || "").trim();
}

export function authConfigured(): boolean {
  return authPassword().length >= 8;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authPassword()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(signature));
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || !authConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const expected = await sign(`${parts[0]}.${parts[1]}`);
  // Confronto a tempo costante sui due testi (stessa lunghezza attesa).
  if (expected.length !== parts[2].length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i);
  }
  return diff === 0;
}

export function verifyPassword(input: string): boolean {
  const expected = authPassword();
  if (!expected || input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
