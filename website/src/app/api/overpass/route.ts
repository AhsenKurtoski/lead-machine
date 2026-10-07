import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const maxDuration = 30;

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

const UA =
  "LeadMachineDemo/1.0 (+https://github.com/AhsenKurtoski/lead-machine)";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 100;
const cache = new Map<string, { ts: number; body: unknown }>();

function queryHash(query: string): string {
  return createHash("sha1").update(query).digest("hex").slice(0, 16);
}

async function fetchMirror(mirror: string, query: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(mirror, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": UA,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  let query: string;
  try {
    const body = await req.json();
    query = typeof body?.query === "string" ? body.query : "";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!query || query.length > 2000) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!/^\[out:json\]\[timeout:\d+\]/.test(query)) {
    return NextResponse.json({ error: "bad_query" }, { status: 400 });
  }

  const hash = queryHash(query);
  const cached = cache.get(hash);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.body);
  }

  const start = Date.now();
  let lastError = "overpass_failed";

  for (const mirror of OVERPASS_MIRRORS) {
    const budget = 28000 - (Date.now() - start);
    if (budget <= 4000) break;

    try {
      const res = await fetchMirror(mirror, query, Math.min(15000, budget));
      if (!res.ok) {
        if (res.status === 429 || res.status === 406) {
          await new Promise((r) => setTimeout(r, 1500));
          if (Date.now() - start < 24000) {
            const retry = await fetchMirror(
              mirror,
              query,
              Math.max(4000, 28000 - (Date.now() - start))
            );
            if (retry.ok) {
              const data = await retry.json();
              cache.set(hash, { ts: Date.now(), body: data });
              return NextResponse.json(data);
            }
          }
        }
        lastError = `mirror_failed (${new URL(mirror).hostname})`;
        continue;
      }
      const data = await res.json();
      cache.set(hash, { ts: Date.now(), body: data });
      if (cache.size > CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      return NextResponse.json(data);
    } catch {
      lastError = `mirror_failed (${new URL(mirror).hostname})`;
      continue;
    } finally {
      if (Date.now() - start < 26000) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  return NextResponse.json({ error: lastError }, { status: 502 });
}
