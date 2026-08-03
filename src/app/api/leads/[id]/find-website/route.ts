import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithSearch, hasGeminiKey } from "@/lib/ai";
import { checkWebsite } from "@/lib/website-check";
import { findWebsiteHeuristic } from "@/lib/website-finder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/leads/[id]/find-website
// 1) Se c'e la chiave Gemini: prova con Gemini + Google Search (qualita massima).
// 2) In ogni caso, se Gemini non trova nulla o ha esaurito la quota,
//    usa una ricerca web GRATUITA (DuckDuckGo) senza alcuna API key.

function normalizeUrl(u: unknown): string | null {
  if (!u) return null;
  let s = String(u).trim();
  const low = s.toLowerCase();
  if (!s || low === "null" || low === "none" || low === "n/a") return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  let t = (text || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first < 0 || last < 0 || last <= first) return null;
  try {
    return JSON.parse(t.slice(first, last + 1));
  } catch {
    return null;
  }
}

export async function POST(_req: Request, context: { params: { id: string } }) {
  try {
    const id = context.params.id;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
    }

    const name = lead.name || "";
    const city = lead.city || "Feltre";
    const category = lead.subcategory || lead.category || "";

    let website: string | null = null;
    let instagram: string | null = null;
    let facebook: string | null = null;
    let confidence = "media";
    let note = "";
    const methods: string[] = [];

    // 1) Gemini + Google Search (se la chiave e disponibile)
    if (await hasGeminiKey()) {
      const prompt = [
        "Cerca su Google informazioni aggiornate su questa attivita locale italiana e stabilisci se possiede un SITO WEB UFFICIALE proprio.",
        "NON considerare come sito ufficiale i portali o directory (PagineGialle, TripAdvisor, TheFork, JustEat, Booking, Facebook, Instagram, LinkedIn, Yelp, ecc.).",
        "",
        "Attivita: " + (name || "-"),
        "Categoria: " + (category || "-"),
        "Indirizzo: " + (lead.addressFull || "-") + " - " + city,
        "Telefono: " + (lead.phone || lead.mobile || "-"),
        "",
        "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (senza markdown e senza testo extra) in questa forma:",
        '{"hasWebsite": true, "website": "https://... oppure null", "instagram": "url oppure null", "facebook": "url oppure null", "confidence": "alta|media|bassa", "note": "breve nota in italiano"}',
        "Regola: 'website' deve essere il dominio PROPRIO dell'attivita. Se non trovi un sito ufficiale, metti hasWebsite=false e website=null.",
      ].join("\n");
      try {
        const r = await generateWithSearch({ prompt, maxTokens: 1024, temperature: 0.2 });
        const parsed = parseJsonLoose(r.text);
        if (parsed) {
          const w = normalizeUrl(parsed.website);
          if (Boolean(parsed.hasWebsite) && w) website = w;
          instagram = normalizeUrl(parsed.instagram);
          facebook = normalizeUrl(parsed.facebook);
          if (typeof parsed.confidence === "string") confidence = parsed.confidence;
          if (typeof parsed.note === "string") note = parsed.note;
          methods.push("Gemini");
        }
      } catch {
        note = "Quota Gemini esaurita o non disponibile: ho usato la ricerca gratuita su Google.";
      }
    }

    // 2) Fallback GRATUITO con DuckDuckGo (nessuna API key) se manca un sito.
    if (!website) {
      try {
        const ddg = await findWebsiteHeuristic(name, city, category);
        if (ddg.website) {
          website = ddg.website;
          confidence = ddg.confidence;
        }
        note = (note ? note + " " : "") + ddg.note;
        methods.push("ricerca web");
      } catch {
        note = (note ? note + " " : "") + "Ricerca web gratuita non riuscita.";
      }
    }

    const method = methods.length ? methods.join(" + ") : "nessun metodo disponibile";

    const data: Record<string, unknown> = {
      instagram: instagram ?? lead.instagram,
      facebook: facebook ?? lead.facebook,
      hasSocial: Boolean(instagram || facebook || lead.hasSocial),
    };

    let check = null;
    if (website) {
      try {
        check = await checkWebsite(website);
      } catch {
        check = null;
      }
      data.website = website;
      data.hasWebsite = true;
      data.websiteStatus = check ? check.status : "da_verificare";
    } else if (lead.website) {
      data.websiteStatus = lead.websiteStatus ?? "da_verificare";
    } else {
      data.hasWebsite = false;
      data.websiteStatus = confidence === "alta" ? "assente" : "da_verificare";
    }

    const updated = await prisma.lead.update({ where: { id }, data });

    const desc = website
      ? "Ricerca sito (" + method + "): trovato " + website + " (confidenza " + confidence + ")."
      : "Ricerca sito (" + method + "): nessun sito ufficiale trovato.";
    await prisma.activity.create({ data: { leadId: id, type: "sistema", description: desc } });

    return NextResponse.json({
      ok: true,
      method,
      found: {
        hasWebsite: Boolean(updated.hasWebsite),
        website: updated.website,
        instagram: updated.instagram,
        facebook: updated.facebook,
        confidence,
        note,
      },
      websiteStatus: updated.websiteStatus,
      check,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
