import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse } from "@/lib/security";
import { checkWebsite } from "@/lib/website-check";
import { confirmWebsiteForLead, findWebsiteHeuristic } from "@/lib/website-finder";
import { extractContactsFromHtml } from "@/lib/contact-extract";
import { fetchPublicHtml } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scarica l'HTML di una pagina. Se non risponde, il chiamante prosegue
// con i dati che ha gia: l'arricchimento non e mai bloccante.
async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetchPublicHtml(url, {
      timeoutMs: 12000,
      maxBytes: 512_000,
      headers: {
        "User-Agent": "LeadMachineBot/1.0 (arricchimento contatti)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    return res.ok ? res.text : "";
  } catch {
    return "";
  }
}

// POST /api/leads/[id]/enrich -> arricchisce la scheda con i contatti
// PUBBLICI del sito dell'attivita: email, Instagram, Facebook e stato del
// sito. Non sovrascrive i dati gia presenti e non inventa nulla: se non
// trova un contatto, la scheda resta com'era. Nessuna chiave AI richiesta.
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = await rateLimitedResponse(req, "leads:enrich", 20, 60000);
  if (rl) return rl;

  const id = (await context.params).id;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  const updated: string[] = [];
  let website = lead.website ?? null;
  let confidence = "alta";
  let note = "";

  // 1) Se il lead non ha un sito, lo cerchiamo (ricerca web gratuita).
  if (!website) {
    const found = await findWebsiteHeuristic(
      lead.name,
      lead.city || "",
      lead.subcategory || lead.category || ""
    );
    confidence = found.confidence;
    note = found.note;
    if (found.website) {
      const confirmed = await confirmWebsiteForLead(found.website, lead);
      if (confirmed) {
        website = found.website;
        updated.push("sito");
      } else {
        // Un candidato scartato non significa "sito assente": resta da
        // verificare, altrimenti l'arricchimento direbbe una cosa non vera.
        confidence = "media";
        note = (note ? note + " " : "") + "Il dominio trovato non contiene la citta' o i contatti del lead: non lo salvo.";
      }
    }
  }

  // 2) Dai contatti pubblici della pagina ricaviamo email e social mancanti.
  let email = lead.email ?? null;
  let instagram = lead.instagram ?? null;
  let facebook = lead.facebook ?? null;

  const html = website ? await fetchHtml(website) : "";
  if (html) {
    const found = extractContactsFromHtml(html);
    if (!email && found.email) {
      email = found.email;
      updated.push("email");
    }
    if (!instagram && found.instagram) {
      instagram = found.instagram;
      updated.push("instagram");
    }
    if (!facebook && found.facebook) {
      facebook = found.facebook;
      updated.push("facebook");
    }
  }

  // 3) Stato reale del sito (raggiungibile, veloce, mobile).
  const check = website ? await checkWebsite(website) : null;

  const data: Record<string, unknown> = {
    email,
    instagram,
    facebook,
    hasSocial: Boolean(instagram || facebook || lead.hasSocial),
  };

  if (website) {
    data.website = website;
    data.hasWebsite = true;
    data.websiteStatus = check ? check.status : "da_verificare";
  } else if (!lead.website) {
    data.hasWebsite = false;
    data.websiteStatus = confidence === "alta" ? "assente" : "da_verificare";
  }

  const saved = await prisma.lead.update({ where: { id }, data });

  const description = updated.length
    ? "Arricchimento contatti: aggiunti " + updated.join(", ") + "."
    : "Arricchimento contatti: nessun nuovo dato pubblico trovato.";
  await prisma.activity.create({ data: { leadId: id, type: "sistema", description } });

  return NextResponse.json({
    ok: true,
    updated,
    found: { website, email, instagram, facebook, confidence },
    websiteStatus: saved.websiteStatus,
    check,
    note: updated.length
      ? ""
      : note || "Nessun contatto pubblico nuovo: i dati attuali restano quelli che avevi.",
  });
}
