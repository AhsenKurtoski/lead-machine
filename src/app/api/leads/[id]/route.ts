import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS } from "@/lib/utils";
import {
  rateLimitedResponse,
  asString,
  asNonEmptyString,
  asInt,
  asNumber,
  asBoolean,
  asArray,
  isValidEmail,
  isLikelyUrl,
  normalizeUrl,
} from "@/lib/security";

export const dynamic = "force-dynamic";

const leadInclude = {
  tags: true,
  activities: { orderBy: { createdAt: "desc" } },
} as const;

const ALLOWED_STATUSES = Object.keys(STATUS_LABELS);

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const lead = await prisma.lead.findUnique({
    where: { id: (await context.params).id },
    include: leadInclude,
  });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, lead });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "leads:item", 180, 60000);
  if (rl) return rl;

  const id = (await context.params).id;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "body mancante" }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if ("name" in body) {
    const v = asNonEmptyString(body.name, 200);
    if (!v) {
      return NextResponse.json({ ok: false, error: "Il nome non puo essere vuoto." }, { status: 400 });
    }
    data.name = v;
  }
  if ("category" in body) {
    const v = asString(body.category, 200);
    data.category = v === null ? null : v;
  }
  if ("subcategory" in body) {
    const v = asString(body.subcategory, 200);
    data.subcategory = v === null ? null : v;
  }
  if ("phone" in body) {
    const v = asString(body.phone, 500);
    data.phone = v === null ? null : v;
  }
  if ("mobile" in body) {
    const v = asString(body.mobile, 500);
    data.mobile = v === null ? null : v;
  }
  if ("whatsapp" in body) {
    const v = asString(body.whatsapp, 500);
    data.whatsapp = v === null ? null : v;
  }
  if ("email" in body) {
    const v = asString(body.email, 254);
    if (v && v.trim() && !isValidEmail(v)) {
      return NextResponse.json({ ok: false, error: "Indirizzo email non valido." }, { status: 400 });
    }
    data.email = v === null ? null : v;
  }
  if ("website" in body) {
    const v = asString(body.website, 2048);
    if (v && v.trim() && !isLikelyUrl(v)) {
      return NextResponse.json({ ok: false, error: "URL del sito non valido." }, { status: 400 });
    }
    data.website = v === null ? null : normalizeUrl(v);
  }
  if ("websiteStatus" in body) {
    const v = asString(body.websiteStatus, 100);
    data.websiteStatus = v === null ? null : v;
  }
  if ("instagram" in body) {
    const v = asString(body.instagram, 500);
    data.instagram = v === null ? null : v;
  }
  if ("facebook" in body) {
    const v = asString(body.facebook, 500);
    data.facebook = v === null ? null : v;
  }
  if ("tiktok" in body) {
    const v = asString(body.tiktok, 500);
    data.tiktok = v === null ? null : v;
  }
  if ("addressFull" in body) {
    const v = asString(body.addressFull, 500);
    data.addressFull = v === null ? null : v;
  }
  if ("city" in body) {
    const v = asString(body.city, 500);
    data.city = v === null ? null : v;
  }
  if ("postalCode" in body) {
    const v = asString(body.postalCode, 100);
    data.postalCode = v === null ? null : v;
  }
  if ("lat" in body) {
    const n = asNumber(body.lat, -90, 90);
    if (body.lat !== null && body.lat !== "" && n === null) {
      return NextResponse.json({ ok: false, error: "Latitudine non valida." }, { status: 400 });
    }
    data.lat = n;
  }
  if ("lng" in body) {
    const n = asNumber(body.lng, -180, 180);
    if (body.lng !== null && body.lng !== "" && n === null) {
      return NextResponse.json({ ok: false, error: "Longitudine non valida." }, { status: 400 });
    }
    data.lng = n;
  }
  if ("notes" in body) {
    const v = asString(body.notes, 10000);
    data.notes = v === null ? null : v;
  }
  if ("priorityReason" in body) {
    const v = asString(body.priorityReason, 2000);
    data.priorityReason = v === null ? null : v;
  }

  if ("status" in body) {
    const s = asString(body.status, 50);
    if (!s || !ALLOWED_STATUSES.includes(s)) {
      return NextResponse.json({ ok: false, error: "Stato non valido." }, { status: 400 });
    }
    data.status = s;
  }
  if ("priorityScore" in body) {
    const n = asInt(body.priorityScore, 0, 100);
    if (n === null) {
      return NextResponse.json({ ok: false, error: "Priorita non valida." }, { status: 400 });
    }
    data.priorityScore = n;
  }
  if ("hasWebsite" in body) {
    const b = asBoolean(body.hasWebsite);
    if (b !== null) data.hasWebsite = b;
  }
  if ("hasSocial" in body) {
    const b = asBoolean(body.hasSocial);
    if (b !== null) data.hasSocial = b;
  }

  // Se cambia un dato verificabile, la vecchia fotografia non vale piu': il
  // runner conserva le verifiche manuali di telefono e indirizzo, quindi senza
  // questa pulizia un dato modificato resterebbe "verificato" per errore.
  const changedVerificationFields = new Set<string>();
  const verificationGroups: Array<[string, string[]]> = [
    ["phone", ["phone", "mobile", "whatsapp"]],
    ["email", ["email"]],
    ["website", ["website", "websiteStatus", "hasWebsite"]],
    ["address", ["addressFull", "city", "postalCode", "lat", "lng"]],
    ["social", ["instagram", "facebook", "tiktok", "hasSocial"]],
  ];
  for (const [field, keys] of verificationGroups) {
    if (
      keys.some(
        (key) =>
          key in body &&
          String(data[key] ?? "") !== String(existing[key as keyof typeof existing] ?? "")
      )
    ) {
      changedVerificationFields.add(field);
    }
  }

  if (Array.isArray(body.tags)) {
    const rawTags = asArray(body.tags) || [];
    const names: string[] = rawTags
      .map((t: unknown) => asString(t, 100))
      .filter((n: string | null): n is string => Boolean(n && n.trim().length > 0))
      .map((n: string) => n.trim());
    for (const name of names) {
      await prisma.tag.upsert({ where: { name }, create: { name }, update: {} });
    }
    data.tags = { set: names.map((name) => ({ name })) };
  }

  try {
    await prisma.lead.update({ where: { id }, data });

    if (changedVerificationFields.size > 0) {
      await prisma.verification.deleteMany({
        where: { leadId: id, field: { in: [...changedVerificationFields] } },
      });
    }

    if (typeof data.status === "string" && data.status !== existing.status) {
      await prisma.activity.create({
        data: { leadId: id, type: "stato", description: "Stato cambiato in " + data.status },
      });
    }

    const lead = await prisma.lead.findUnique({ where: { id }, include: leadInclude });
    return NextResponse.json({ ok: true, lead });
  } catch {
    return NextResponse.json({ ok: false, error: "Aggiornamento non riuscito." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "leads:item", 60, 60000);
  if (rl) return rl;

  const id = (await context.params).id;
  const existing = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, websiteScreenshot: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  await prisma.lead.delete({ where: { id } });

  // Rimuove lo screenshot locale, se presente e dentro la cartella prevista.
  if (existing.websiteScreenshot?.startsWith("/screenshots/")) {
    try {
      const { unlink } = await import("node:fs/promises");
      const path = await import("node:path");
      const file = path.join(process.cwd(), "public", existing.websiteScreenshot);
      const root = path.join(process.cwd(), "public", "screenshots");
      if (file.startsWith(root + path.sep)) await unlink(file);
    } catch {
      // File gia assente o non rimovibile: non blocca la cancellazione del lead.
    }
  }

  return NextResponse.json({ ok: true });
}
