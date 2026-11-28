// ============================================================
// Contatori di rate limit condivisi.
//
// Prima vivevano in una Map del processo: su un solo server andava bene, ma
// su Cloudflare Workers ogni isolate ha la sua mappa e la azzera al cold
// start, quindi il limite era molto piu' debole di quanto sembrasse.
// Qui il contatore sta nella tabella `RateLimit` del database applicativo
// (la stessa SQLite locale / D1 in produzione), quindi vale per tutte le
// istanze.
//
// Il costo e' una lettura e una scrittura per richiesta limitata: sono
// endpoint a bassa frequenza (login, scritture, API pubbliche), non il
// rendering delle pagine.
// ============================================================
import { prisma } from "@/lib/prisma";

export type RateLimitState = {
  count: number;
  remaining: number;
  blocked: boolean;
  resetAfterMs: number;
};

// Le righe scadute non fermano nessuno, ma crescerebbero all'infinito:
// ogni 200 richieste si tenta una pulizia best-effort.
const PRUNE_EVERY = 200;
let pruneTick = 0;

function pruneExpired(now: Date) {
  pruneTick = (pruneTick + 1) % PRUNE_EVERY;
  if (pruneTick !== 0) return;
  // Best-effort: se la pulizia fallisce la richiesta corrente non deve
  // fallire per questo, e la riga scaduta verra' comunque riusata.
  void prisma.rateLimit
    .deleteMany({ where: { resetAt: { lt: now } } })
    .catch(() => undefined);
}

export async function hitSharedRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitState> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  // Incremento atomico della finestra attiva. `count` resta lo stesso anche
  // con richieste concorrenti: e' un solo UPDATE condizionato dalla data.
  const updated = await prisma.rateLimit.updateMany({
    where: { key, resetAt: { gt: now } },
    data: { count: { increment: 1 } },
  });

  let count: number;
  let windowEnd: Date;
  if (updated.count === 0) {
    // Nessuna finestra attiva: prima richiesta o finestra scaduta. L'upsert
    // riparte da 1 anche se un'altra istanza ha appena reinserito la riga.
    const row = await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    count = row.count;
    windowEnd = row.resetAt;
  } else {
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row) throw new Error(`riga di rate limit sparita dopo l'incremento: ${key}`);
    count = row.count;
    windowEnd = row.resetAt;
  }

  pruneExpired(now);
  return {
    count,
    remaining: Math.max(0, max - count),
    blocked: count > max,
    resetAfterMs: Math.max(0, windowEnd.getTime() - now.getTime()),
  };
}

// Se il database non risponde non vogliamo un 500 sul login: si ripiega sul
// contatore in memoria del chiamante. Per non aggiungere latenza a ogni
// richiesta durante un guasto, si riprova l'archivio condiviso dopo 30s.
const RETRY_AFTER_FAILURE_MS = 30_000;
let downUntil = 0;

export async function hitSharedRateLimitSafely(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitState | null> {
  if (Date.now() < downUntil) return null;
  try {
    return await hitSharedRateLimit(key, max, windowMs);
  } catch (error) {
    downUntil = Date.now() + RETRY_AFTER_FAILURE_MS;
    console.warn(
      `[rate-limit] archivio condiviso non disponibile, uso la memoria per ${
        RETRY_AFTER_FAILURE_MS / 1000
      }s: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
