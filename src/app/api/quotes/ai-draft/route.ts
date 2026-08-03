import { rateLimitedResponse, asString, asInt, asBoolean, asArray, asNumber } from "@/lib/security";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/quotes/ai-draft  { leadId }
// Genera con l'AI (Gemini/Groq con failover) una BOZZA di voci di preventivo
// su misura per il lead. Restituisce items[] da caricare nel form preventivo.

type DraftItem = { description: string; qty: number; price: number };

const SYSTEM_PROMPT =
  "Sei un consulente web e marketing per piccole attivita locali italiane. " +
  "Proponi preventivi realistici e onesti, con prezzi di mercato italiani per micro-imprese. " +
  "Scrivi in italiano corretto con gli accenti giusti.";

function parseDraft(text: string): DraftItem[] {
  let t = (text || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  const first = t.indexOf("[");
  const last = t.lastIndexOf("]");
  if (first < 0 || last < 0 || last <= first) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(t.slice(first, last + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: DraftItem[] = [];
  for (const it of arr) {
    const o = (it ?? {}) as Record<string, unknown>;
    const description = String(o.description ?? "").trim();
    if (!description) continue;
    let qty = Number(o.qty ?? 1);
    if (!Number.isFinite(qty) || qty <= 0) qty = 1;
    let price = Number(o.price ?? 0);
    if (!Number.isFinite(price) || price < 0) price = 0;
    if (price > 100000) price = 100000;
    out.push({ description, qty: Math.round(qty), price: Math.round(price) });
    if (out.length >= 8) break;
  }
  return out;
}

export async function POST(req: Request) {
  const rl = await rateLimitedResponse(req, "ai:draft", 15, 60000);
  if (rl) return rl;
  try {
    const body = await req.json().catch(() => ({}));
    const leadId = asString(body?.leadId, 100);
    const category = asString(body?.category, 200);
    const language = asString(body?.language, 10);
    const note = asString(body?.note, 2000);
    if (!leadId) {
      return NextResponse.json({ ok: false, error: "leadId mancante" }, { status: 400 });
    }
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
    }

    const ctx = [
      "Nome attivita: " + (lead.name || "-"),
      "Categoria: " + (category || lead.subcategory || lead.category || "-"),
      "Citta: " + (lead.city || "Feltre"),
      "Ha un sito web: " + (lead.hasWebsite ? "si (stato: " + (lead.websiteStatus || "?") + ")" : "no/non rilevato"),
      "Ha social: " + (lead.hasSocial ? "si" : "no/non rilevato"),
      note ? "Note utente: " + note : "",
    ].filter(Boolean).join("\n");

    const prompt =
      "Crea una BOZZA di preventivo su misura per questa attivita locale, come web agency. " +
      "Considera cosa manca (sito assente o vecchio, social assenti, ecc.) e proponi da 3 a 6 voci utili e realistiche. " +
      "Prezzi in EURO, IVA esclusa, adatti a micro-imprese italiane.\n\n" +
      (language ? "Lingua risposta: " + language + "\n\n" : "") +
      "DATI ATTIVITA:\n" + ctx + "\n\n" +
      "Rispondi ESCLUSIVAMENTE con un array JSON valido (senza markdown, senza testo extra) nella forma: " +
      '[{"description": "...", "qty": 1, "price": 390}]';

    try {
      const r = await generateText({ system: SYSTEM_PROMPT, prompt, maxTokens: 1000, temperature: 0.6 });
      const items = parseDraft(r.text);
      if (items.length === 0) {
        return NextResponse.json({ ok: false, note: "L'AI non ha restituito voci valide. Riprova." });
      }
      return NextResponse.json({ ok: true, provider: r.provider, items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const note =
        msg === "NO_AI_KEYS"
          ? "Nessuna chiave AI configurata. Vai in Impostazioni e incolla una chiave gratuita, poi salva."
          : "AI non disponibile (" + msg + ").";
      return NextResponse.json({ ok: false, note });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
