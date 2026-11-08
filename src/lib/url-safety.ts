// ============================================================
// Validazione URL per richieste server-side.
//
// Qualunque URL arrivi dal client (screenshot, sito del lead, ricerca web)
// non deve poter raggiungere loopback, reti private, link-local o metadata
// cloud. Questo modulo risolve il DNS e rifiuta gli indirizzi non pubblici,
// segue i redirect uno alla volta e limita la dimensione del corpo letto.
// ============================================================

import { lookup as dnsLookup } from "node:dns";

export type PublicFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  method?: string;
};

export type PublicFetchResult = {
  status: number;
  ok: boolean;
  text: string;
  finalUrl: string;
};

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan"];

// Cloudflare Workers do not provide node:net, so these checks are pure JS.
function isIPv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
}

function isIPv6(value: string): boolean {
  const ip = value.replace(/^\[|\]$/g, "");
  if (!ip.includes(":") || !/^[0-9a-f:.]+$/i.test(ip)) return false;
  return ip.split("::").length <= 2;
}

function isIP(value: string): boolean {
  return isIPv4(value) || isIPv6(value);
}

function lookupAll(hostname: string): Promise<{ address: string }[]> {
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inV4Range(value: number, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  const bits = Number(bitsRaw);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (baseInt & mask);
}

const BLOCKED_V4 = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
];

export function isPrivateAddress(address: string): boolean {
  const ip = address.trim().toLowerCase();
  if (!ip) return true;
  if (isIPv4(ip)) {
    const value = ipv4ToInt(ip);
    return value === null || BLOCKED_V4.some((range) => inV4Range(value, range));
  }
  if (isIPv6(ip)) {
    const compact = ip.replace(/^\[|\]$/g, "");
    if (compact === "::" || compact === "::1") return true;
    if (compact.startsWith("fc") || compact.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(compact)) return true;
    // IPv4-mapped: ::ffff:127.0.0.1
    const mapped = compact.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  if (h === "localhost" || h === "localhost.localdomain") return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => h.endsWith(suffix))) return true;
  if (isIP(h)) return isPrivateAddress(h);
  return false;
}

/**
 * Valida un URL http/https pubblico.
 * `resolveDns` va lasciato true per la richiesta principale e per i redirect;
 * false solo per le sotto-risorse del browser dove una risoluzione per ogni
 * immagine sarebbe troppo costosa (i literal privati restano bloccati).
 */
export async function assertPublicHttpUrl(
  input: string,
  opts: { resolveDns?: boolean } = {}
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL non valido.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Sono consentiti solo URL http/https.");
  }
  if (url.username || url.password) {
    throw new Error("URL con credenziali non consentito.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error("URL verso host locale o privato non consentito.");
  }
  if (opts.resolveDns !== false && !isIP(url.hostname)) {
    let addresses: { address: string }[];
    try {
      addresses = await lookupAll(url.hostname);
    } catch {
      throw new Error("Host non risolvibile.");
    }
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
      throw new Error("URL verso indirizzo privato non consentito.");
    }
  }
  return url;
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        chunks.push(value.subarray(0, Math.max(0, value.byteLength - (total - maxBytes))));
        break;
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const merged = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function fetchPublicHtml(
  input: string,
  options: PublicFetchOptions = {}
): Promise<PublicFetchResult> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? 512_000;
  const maxRedirects = options.maxRedirects ?? 3;
  let current = await assertPublicHttpUrl(input);

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const res = await fetch(current, {
      method: options.method ?? "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "LeadMachine/1.0 (+https://github.com/AhsenKurtoski/lead-machine)",
        Accept: "text/html,application/xhtml+xml",
        ...options.headers,
      },
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect senza Location.");
      const next = new URL(location, current).toString();
      current = await assertPublicHttpUrl(next);
      continue;
    }

    return {
      status: res.status,
      ok: res.ok,
      text: await readLimitedText(res, maxBytes),
      finalUrl: current.toString(),
    };
  }

  throw new Error("Troppi redirect.");
}
