import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { rateLimitedResponse, asString } from "@/lib/security";
import { needsOnboarding, validateOnboarding } from "@/lib/onboarding";
import { geocodeCity } from "@/lib/geocode";

export const dynamic = "force-dynamic";

// GET /api/onboarding -> stato del primo avvio + valori gia salvati
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    ok: true,
    needsOnboarding: needsOnboarding(s),
    values: {
      brandName: s.brand_name ?? "",
      owner: s.brand_owner ?? "",
      searchCity: s.search_city ?? "",
    },
  });
}

// POST /api/onboarding -> salva i dati del primo avvio.
// { brandName?, owner?, searchCity, skip?: boolean }
export async function POST(req: NextRequest) {
  const rl = await rateLimitedResponse(req, "onboarding:save", 20, 60000);
  if (rl) return rl;

  const body = await req.json().catch(() => ({}));

  // "Salta": l'utente non vuole il guidato. Non si insiste.
  if (body && body.skip === true) {
    await prisma.setting.upsert({
      where: { key: "onboarding_done" },
      update: { value: "skipped" },
      create: { key: "onboarding_done", value: "skipped" },
    });
    return NextResponse.json({ ok: true, skipped: true });
  }

  const input = {
    brandName: asString(body?.brandName, 120),
    owner: asString(body?.owner, 120),
    searchCity: asString(body?.searchCity, 100),
  };
  const validation = validateOnboarding(input);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, errors: validation.errors }, { status: 400 });
  }

  const city = (input.searchCity ?? "").trim();

  // Geocoding reale della citta: se non va a buon fine salviamo lo stesso
  // il nome, ma SENZA inventare coordinate (la ricerca le chiedera' poi).
  const point = await geocodeCity(city);

  const updates: Array<{ key: string; value: string }> = [
    { key: "search_city", value: city },
    { key: "onboarding_done", value: "true" },
  ];
  if ((input.brandName ?? "").trim()) updates.push({ key: "brand_name", value: (input.brandName ?? "").trim() });
  if ((input.owner ?? "").trim()) updates.push({ key: "brand_owner", value: (input.owner ?? "").trim() });
  if (point) {
    updates.push({ key: "search_lat", value: String(point.lat) });
    updates.push({ key: "search_lng", value: String(point.lng) });
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.setting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    geocoded: Boolean(point),
    displayName: point?.displayName ?? null,
  });
}
