import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { buildColdCallScript, coldCallScriptToText } from "@/lib/cold-call";
import { generateText } from "@/lib/ai";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function digits(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "");
}

export async function GET(req: Request) {
  try {
    const rl = await rateLimitedResponse(req, "coldcall:list", 60, 60000);
    if (rl) return rl;

    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "1";
    const settings = await getSettings();

    const where = all ? {} : { status: { in: ["NUOVO", "CONTATTATO"] } };
    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: 300,
    });

    const items = leads
      .filter((l) => digits(l.mobile || l.phone).length >= 6)
      .map((l) => {
        const script = buildColdCallScript(l, settings);
        return {
          id: l.id,
          name: l.name,
          phone: l.mobile || l.phone || "",
          city: l.city,
          category: l.subcategory || l.category,
          status: l.status,
          priorityScore: l.priorityScore,
          kind: script.kind,
          script,
        };
      });

    return NextResponse.json({ ok: true, total: items.length, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimitedResponse(req, "coldcall:save", 30, 60000);
    if (rl) return rl;

    const body = await req.json().catch(() => ({}));
    const leadId = asString(body.leadId, 100) || "";
    const answers = asArray(body.answers) || [];
    const action = asString(body.action, 50) || "ai";
    const esito = asString(body.esito, 500) || "Chiamata effettuata";
    const note = asString(body.note, 2000) || "";

    if (!leadId) {
      return NextResponse.json({ ok: false, error: "leadId mancante" }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
    }

    const settings = await getSettings();

    if (action === "log") {
      const noteSuffix = note.trim() ? " - " + note.trim() : "";
      await prisma.activity.create({
        data: { leadId, type: "chiamata", description: esito + noteSuffix },
      });
      if (lead.status === "NUOVO") {
        await prisma.lead.update({ where: { id: leadId }, data: { status: "CONTATTATO" } });
      }
      return NextResponse.json({ ok: true, logged: true });
    }

    const base = buildColdCallScript(lead, settings);
    const baseText = coldCallScriptToText(base);
    const me = settings.brand_owner || settings.brand_name || "il venditore";
    const ag = settings.brand_name || "la web agency";
    const cat = (lead.subcategory || lead.category || "attivita").toLowerCase();
    const city = lead.city || "Feltre";

    const system =
      "Sei un esperto di vendita telefonica e telemarketing per piccole web agency italiane. " +
      "Scrivi script per telefonate a freddo naturali, brevi, in prima persona, in italiano corretto con gli accenti giusti. " +
      "Tono umano e cordiale, niente frasi robotiche, niente promesse esagerate. L'obiettivo non e vendere subito ma ottenere il permesso di inviare l'anteprima e fissare un secondo contatto.";
    const prompt =
      "Personalizza e migliora questo script di telefonata a freddo per un caso specifico.\n\n" +
      "Chi chiama: " + me + " di " + ag + ".\n" +
      "Attivita da chiamare: " + lead.name + " (" + cat + ", " + city + ").\n" +
      "Situazione: " + (base.kind === "con_sito" ? "ha gia un sito, proponi un restyling" : "non ha un sito, proponi un nuovo sito con anteprima gratuita") + ".\n" +
      (lead.googleRating ? ("Valutazione Google: " + lead.googleRating + "/5.\n") : "") +
      "\nUsa questa traccia come base e rendila piu specifica e scorrevole:\n" + baseText + "\n\n" +
      "Restituisci lo script completo e pronto da leggere, organizzato in sezioni: Apertura, Gancio, Valore, Gestione obiezioni (almeno 4), Chiusura con richiesta di appuntamento. Scrivi solo lo script.";

    let text = "";
    let provider = "";
    try {
      const res = await generateText({ system, prompt, maxTokens: 2048, temperature: 0.8 });
      text = (res.text || "").trim();
      provider = res.provider;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const note =
        msg === "NO_AI_KEYS"
          ? "Nessuna chiave AI configurata. Vai in Impostazioni e incolla una chiave gratuita (es. Google Gemini): intanto puoi usare lo script gia pronto qui sotto."
          : "AI non disponibile al momento (" + msg + "). Usa lo script gia pronto qui sotto.";
      return NextResponse.json({ ok: false, note });
    }

    if (!text) {
      return NextResponse.json({ ok: false, note: "L'AI non ha restituito testo. Riprova tra poco." });
    }

    await prisma.activity.create({
      data: { leadId, type: "sistema", description: "Script cold call generato con AI (" + provider + ")." },
    });
    return NextResponse.json({ ok: true, provider, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
