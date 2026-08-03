import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { fillTemplate } from "@/lib/templates";
import { generateText, aiConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/ai/personalize
// body: { leadId: string, baseText: string, channel: "whatsapp" | "email" }
// Migliora/personalizza il messaggio con l'AI (Gemini/Groq con failover).
// Se nessuna chiave e configurata, restituisce il template gia compilato coi dati.

const SYSTEM_PROMPT =
  "Sei un esperto di marketing locale italiano. Scrivi messaggi di primo contatto brevi, naturali, cordiali e mai spam. " +
  "Usa un italiano corretto e curato, con gli accenti giusti (e/è, gia/già, piu/più, perche/perché, attivita/attività, citta/città). " +
  "Mantieni i dati reali forniti e non inventare nulla. Niente emoji eccessive.";

function buildUserPrompt(channel: string, contesto: string, filled: string): string {
  return (
    "Personalizza e migliora questo messaggio di primo contatto (canale " +
    channel +
    ") per un'attivita locale, mantenendolo breve, cordiale e non spam. " +
    "Usa SOLO i dati forniti, non inventare nulla. Rispondi in italiano corretto (con accenti) e " +
    "restituisci SOLO il testo finale del messaggio, senza spiegazioni ne virgolette.\n\n" +
    "DATI ATTIVITA:\n" +
    contesto +
    "\n\nMESSAGGIO BASE DA MIGLIORARE:\n" +
    filled
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const lead = await prisma.lead.findUnique({ where: { id: body.leadId } });
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
    }

    const settings = await getSettings();
    const filled = fillTemplate(body.baseText ?? "", lead, settings);
    const channel = body.channel === "email" ? "email" : "WhatsApp";

    // Nessuna chiave configurata: restituisco il template gia personalizzato.
    if (!(await aiConfigured())) {
      return NextResponse.json({
        ok: true,
        aiUsed: false,
        text: filled,
        note:
          "Nessuna chiave AI configurata. " +
          "Ho restituito il testo del template gia personalizzato coi dati del lead. " +
          "Suggerimento: vai in Impostazioni e incolla una chiave gratuita (consigliato Google Gemini), poi salva. " +
          "Le chiavi salvate in Impostazioni sono usate subito.",
      });
    }

    const contesto = [
      "Nome attivita: " + (lead.name ?? "-"),
      "Categoria: " + (lead.subcategory ?? lead.category ?? "-"),
      "Citta: " + (lead.city ?? "-"),
      "Ha un sito web: " + (lead.hasWebsite ? "si" : "non rilevato"),
      "Ha social: " + (lead.hasSocial ? "si" : "non rilevato"),
    ].join("\n");
    const prompt = buildUserPrompt(channel, contesto, filled);

    try {
      const r = await generateText({
        system: SYSTEM_PROMPT,
        prompt,
        maxTokens: 800,
        temperature: 0.7,
      });
      return NextResponse.json({ ok: true, aiUsed: true, provider: r.provider, text: r.text });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({
        ok: true,
        aiUsed: false,
        text: filled,
        note: "AI non disponibile (" + msg + "): uso il testo del template gia personalizzato.",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
