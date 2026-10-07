import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { generateDemoHtml } from "@/lib/demo-generate";
import { validateApiKey, CORS_HEADERS, rateLimitApiKey, requireScope } from "@/lib/api-auth";
import { asString, asBoolean } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// POST /api/v1/demo/generate -> Genera un sito HTML professionale per un lead con AI
export async function POST(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: CORS_HEADERS });
  }
  const scope = requireScope(auth.apiKey.scopes, "ai");
  if (!scope.ok) return scope.response;
  // La generazione AI costa quota: limitiamo stretto per evitare abusi.
  const limited = await rateLimitApiKey(auth.apiKey.id, "v1:demo:generate", 15, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const leadId = asString(body.leadId, 100);
    const force = asBoolean(body.force) ?? false;
    const customPrompt = asString(body.prompt, 8000) || "";

    if (!leadId) {
      return NextResponse.json({ ok: false, error: "leadId obbligatorio" }, { status: 400, headers: CORS_HEADERS });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404, headers: CORS_HEADERS });
    }

    if (!force && lead.demoHtml) {
      return NextResponse.json({
        ok: true,
        cached: true,
        provider: "cache",
        html: lead.demoHtml,
      }, { headers: CORS_HEADERS });
    }

    const settings = await getSettings();
    const brandName = settings.brand_name || "Ahsen-Studio";
    const brandOwner = settings.brand_owner || "";
    const bookingEmail = settings.formsubmit_email || settings.brand_email || lead.email || "";

    const gen = await generateDemoHtml(lead, brandName, brandOwner, bookingEmail, customPrompt || lead.demoPrompt || "");

    if (!gen) {
      return NextResponse.json(
        {
          ok: false,
          error: "L'AI non ha restituito un sito completo. Riprova tra qualche secondo.",
        },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        demoHtml: gen.html,
        demoHtmlAt: new Date(),
        demoPrompt: customPrompt || lead.demoPrompt,
      },
    });

    await prisma.activity.create({
      data: {
        leadId,
        type: "sistema",
        description: `Sito vetrina generato via API (${auth.apiKey.name})`,
      },
    });

    return NextResponse.json({
      ok: true,
      provider: gen.provider,
      html: gen.html,
      length: gen.html.length,
    }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore generazione sito";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
