import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { generateDemoHtml } from "@/lib/demo-generate";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const rl = await rateLimitedResponse(req, "demo:generate", 8, 60000);
    if (rl) return rl;

    const body = await req.json().catch(() => ({}));
    const leadId = asString(body.leadId, 100) || "";
    const prompt = asString(body.prompt, 8000) || "";
    const locale = asString(body.locale, 10) || "";
    const preset = asString(body.preset, 100) || "";
    const customPrompt = asString(body.customPrompt, 8000) || "";
    const force = asBoolean(body.force) ?? false;

    if (!leadId) {
      return NextResponse.json({ ok: false, error: "leadId mancante" }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
    }

    if (!force && lead.demoHtml) {
      return NextResponse.json({ ok: true, cached: true, provider: "cache" });
    }

    const settings = await getSettings();
    const brandName = settings.brand_name || "La tua Web Agency";
    const brandOwner = settings.brand_owner || "";
    const bookingEmail = settings.formsubmit_email || settings.brand_email || lead.email || "";
    const promptToUse = customPrompt.trim() || prompt.trim() || lead.demoPrompt || "";

    let gen;
    try {
      gen = await generateDemoHtml(lead, brandName, brandOwner, bookingEmail, promptToUse);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (customPrompt.trim()) {
        await prisma.lead.update({ where: { id: leadId }, data: { demoPrompt: customPrompt.trim() } });
      }
      const note =
        msg === "NO_AI_KEYS"
          ? "Nessuna chiave AI configurata. Vai in Impostazioni e incolla una chiave gratuita (consigliato Google Gemini), poi salva: da quel momento ogni sito verra creato su misura dall'AI. Per ora viene mostrato il sito demo predefinito."
          : "AI non disponibile al momento (" + msg + "). Riprova tra poco. Per ora viene mostrato il sito demo predefinito.";
      return NextResponse.json({ ok: false, note });
    }

    if (!gen) {
      return NextResponse.json({
        ok: false,
        note: "L'AI non ha restituito un sito completo. Riprova tra qualche secondo.",
      });
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        demoHtml: gen.html,
        demoHtmlAt: new Date(),
        demoPrompt: customPrompt.trim() ? customPrompt.trim() : lead.demoPrompt,
      },
    });
    await prisma.activity.create({
      data: {
        leadId,
        type: "sistema",
        description: "Sito vetrina generato con AI (" + gen.provider + ").",
      },
    });

    return NextResponse.json({ ok: true, provider: gen.provider, length: gen.html.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
