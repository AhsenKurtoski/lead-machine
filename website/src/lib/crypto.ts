const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const KEY_ALGORITHM = "PBKDF2";
const ENCRYPTION_ALGORITHM = "AES-GCM";
const HASH_ALGORITHM = "SHA-256";

type EncryptedData = {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
};

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function encodeStr(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function decodeStr(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = ITERATIONS
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encodeStr(password) as BufferSource,
    { name: KEY_ALGORITHM },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: KEY_ALGORITHM,
      salt: salt as BufferSource,
      iterations,
      hash: HASH_ALGORITHM,
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptByok(
  plaintext: string,
  password: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv: iv as BufferSource },
    key,
     encodeStr(plaintext) as BufferSource,
  );

  const data: EncryptedData = {
    ciphertext: bufToB64(ciphertext),
    iv: bufToB64(iv.buffer),
    salt: bufToB64(salt.buffer),
    iterations: ITERATIONS,
  };
  return JSON.stringify(data);
}

export async function decryptByok(
  ciphertext: string,
  password: string
): Promise<string | null> {
  try {
    const data: EncryptedData = JSON.parse(ciphertext);
    const salt = new Uint8Array(b64ToBuf(data.salt));
    const iv = new Uint8Array(b64ToBuf(data.iv));
    const key = await deriveKey(password, salt, data.iterations);

    const plain = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv: iv as BufferSource },
      key,
      b64ToBuf(data.ciphertext)
    );
    return decodeStr(plain);
  } catch {
    return null;
  }
}

export function getBrowserFingerprint(): string {
  if (typeof navigator === "undefined") return "server-side";
  const parts = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen?.width + "x" + screen?.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "?",
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || "?",
  ].filter(Boolean);
  return parts.join("|").slice(0, 256);
}

const STORAGE_PREFIX = "lm_byok_";
const STORED_KEYS = ["gemini_api_key", "groq_api_key", "smtp_host", "smtp_port", "smtp_user", "smtp_pass"] as const;

export type ByokKeys = Partial<Record<(typeof STORED_KEYS)[number], string>>;

export async function storeByokKeysLocal(keys: ByokKeys): Promise<void> {
  if (typeof localStorage === "undefined") return;
  const fp = getBrowserFingerprint();
  const serialized = JSON.stringify(keys);
  const encrypted = await encryptByok(serialized, fp);
  localStorage.setItem(STORAGE_PREFIX + "keys", encrypted);
}

export async function loadByokKeysLocal(): Promise<ByokKeys> {
  if (typeof localStorage === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_PREFIX + "keys");
  if (!raw) return {};
  const fp = getBrowserFingerprint();
  const decrypted = await decryptByok(raw, fp);
  if (!decrypted) return {};
  try {
    return JSON.parse(decrypted) as ByokKeys;
  } catch {
    return {};
  }
}

export function clearByokKeysLocal(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_PREFIX + "keys");
}
