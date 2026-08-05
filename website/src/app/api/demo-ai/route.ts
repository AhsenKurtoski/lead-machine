import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/demo/ai";

export const maxDuration = 60;

const CREDIT_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PROMPT_LENGTH = 8000;

type UsageEntry = { count: number; windowStart: number };

const usage = new Map<string, UsageEntry>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEMO_AI_KEY;

  if (!apiKey) {
    return NextResponse.json({ notConfigured: true });
  }

  let prompt: unknown;
  try {
    const body = await req.json();
    prompt = body?.prompt;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (typeof prompt !== "string" || prompt.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const now = Date.now();

  let entry = usage.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now };
  }

  if (entry.count >= CREDIT_LIMIT) {
    return NextResponse.json({ remaining: 0, error: "quota" }, { status: 429 });
  }

  try {
    const text = await callGemini(prompt, apiKey);
    entry.count += 1;
    usage.set(ip, entry);
    return NextResponse.json({ text, remaining: CREDIT_LIMIT - entry.count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upstream_error" },
      { status: 502 }
    );
  }
}
