import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { rateLimitedResponse, asString } from "@/lib/security";

export const dynamic = "force-dynamic";

// Chiavi consentite per le impostazioni (whitelist).
// Tutte le altre vengono ignorate per sicurezza.
const ALLOWED_KEYS: Record<string, { maxLen: number; pattern?: RegExp }> = {
  brand_owner: { maxLen: 120 },
  brand_holder: { maxLen: 120 },
  brand_name: { maxLen: 120 },
  brand_tagline: { maxLen: 200 },
  brand_logo: { maxLen: 500 },
  brand_phone: { maxLen: 40 },
  brand_email: { maxLen: 254 },
  formsubmit_email: { maxLen: 254 },
  brand_website: { maxLen: 500 },
  brand_vat: { maxLen: 40 },
  brand_address: { maxLen: 500 },
  brand_city: { maxLen: 100 },
  search_city: { maxLen: 100 },
  search_lat: { maxLen: 50 },
  search_lng: { maxLen: 50 },
  search_radius_m: { maxLen: 20 },
  locale: { maxLen: 10, pattern: /^[a-z]{2}(-[A-Z]{2})?$/i },
  currency: { maxLen: 10, pattern: /^[A-Z]{3}$/ },
  tax_rate_default: { maxLen: 20 },
  gemini_api_key: { maxLen: 500 },
  gemini_model: { maxLen: 200 },
  groq_api_key: { maxLen: 500 },
  groq_model: { maxLen: 200 },
  ai_order: { maxLen: 100 },
  smtp_host: { maxLen: 255 },
  smtp_port: { maxLen: 20 },
  smtp_user: { maxLen: 255 },
  smtp_pass: { maxLen: 500 },
  smtp_from: { maxLen: 255 },
  osm_contact_email: { maxLen: 254 },
  geoapify_api_key: { maxLen: 500 },
  privacy_mode: { maxLen: 20 },
};

export async function GET() {
  const settings = await getSettings();
  // Rimuovi le chiavi sensibili dalla risposta al client (mascherale).
  const redacted: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (k.endsWith("_api_key") || k.endsWith("_pass")) {
      redacted[k] = v ? "••••••••" : "";
    } else {
      redacted[k] = v;
    }
  }
  return NextResponse.json({ ok: true, settings: redacted });
}

// POST { settings: { key: value, ... } } -> upsert
export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "settings:write", 60, 60_000);
  if (rl) return rl;

  try {
    const body = await req.json().catch(() => ({}));
    const rawEntries =
      (body && typeof body.settings === "object" && !Array.isArray(body.settings) ? body.settings : {}) as Record<
        string,
        unknown
      >;

    const updates: Array<{ key: string; value: string }> = [];
    const rejected: Array<{ key: string; reason: string }> = [];

    for (const [rawKey, rawVal] of Object.entries(rawEntries)) {
      const rule = ALLOWED_KEYS[rawKey];
      if (!rule) {
        rejected.push({ key: rawKey, reason: "whitelist" });
        continue;
      }
      const val = asString(rawVal, rule.maxLen);
      if (val == null) {
        rejected.push({ key: rawKey, reason: "sanitization" });
        continue;
      }
      if (rule.pattern && val && !rule.pattern.test(val)) {
        rejected.push({ key: rawKey, reason: "pattern" });
        continue;
      }
      if ((rawKey.endsWith("_api_key") || rawKey.endsWith("_pass")) && /^•+$/.test(val)) continue;
      updates.push({ key: rawKey, value: val });
    }

    if (rejected.length > 0 && typeof console !== "undefined") {
      console.warn(
        "[settings:write] Chiavi scartate dalla whitelist o non valide:",
        rejected.map((r) => r.key + "(" + r.reason + ")").join(", ")
      );
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.setting.upsert({
            where: { key: u.key },
            update: { value: u.value },
            create: { key: u.key, value: u.value },
          })
        )
      );
    }

    return NextResponse.json({
      ok: true,
      updated: updates.length,
      accepted: updates.map((u) => u.key),
      rejected: rejected.map((r) => ({ key: r.key, reason: r.reason })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
