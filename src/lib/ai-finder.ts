// Lead AI Finder: usa Gemini (con grounding Google Search) per scovare attivita
// locali REALI che probabilmente NON hanno un sito web. E una fonte aggiuntiva
// che si somma a OpenStreetMap e Geoapify. Se Gemini non e configurato,
// restituisce semplicemente una lista vuota (fallback silenzioso sulle altre fonti).

import { generateWithSearch, aiConfigured } from "@/lib/ai";
import { normalizePhone, type OsmCandidate } from "@/lib/overpass";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Estrae il primo array JSON presente nel testo (gestisce code fence ```json).
function extractJsonArray(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return "[]";
  return t.slice(start, end + 1);
}

type RawBusiness = {
  nome?: string;
  categoria?: string;
  indirizzo?: string;
  citta?: string;
  telefono?: string;
};

export type AiFinderResult = {
  candidates: OsmCandidate[];
  used: boolean;
  provider?: string;
};

// categoryLabels: etichette leggibili delle categorie scelte (es. "Ristoranti").
export async function runAiFinderSearch(
  categoryLabels: string[],
  lat: number,
  lng: number,
  radiusM: number,
  cityName: string,
): Promise<AiFinderResult> {
  // Basta una qualsiasi chiave AI: con Gemini si usa la ricerca Google,
  // altrimenti si ripiega su un modello senza grounding (vedi generateWithSearch).
  const aiReady = await aiConfigured();
  if (!aiReady) {
    return { candidates: [], used: false };
  }

  const radiusKm = Math.max(1, Math.round(radiusM / 1000));
  const cats = categoryLabels.length > 0 ? categoryLabels.join(", ") : "qualsiasi attivita commerciale o di servizi";

  const prompt = [
    "Sei un assistente che trova attivita commerciali locali REALI in Italia usando la ricerca Google.",
    "Obiettivo: elenca attivita che con buona probabilita NON hanno ancora un sito web proprio (spesso piccole realta presenti solo su Google Maps, Pagine Gialle o social).",
    "",
    "Zona di ricerca: entro circa " + radiusKm + " km da " + cityName + " (coordinate " + lat.toFixed(4) + ", " + lng.toFixed(4) + "), provincia di Belluno, Veneto.",
    "Categorie di interesse: " + cats + ".",
    "",
    "Regole:",
    "- Includi SOLO attivita reali ed esistenti, con nome corretto. Non inventare nulla.",
    "- Preferisci attivita SENZA sito web ufficiale.",
    "- Se conosci telefono e indirizzo, includili; altrimenti lasciali vuoti. NON inventare numeri.",
    "- Massimo 15 risultati.",
    "",
    "Rispondi ESCLUSIVAMENTE con un array JSON valido, senza testo aggiuntivo, in questo formato:",
    '[{"nome":"...","categoria":"...","indirizzo":"...","citta":"...","telefono":"..."}]',
  ].join("\n");

  const { text, provider } = await generateWithSearch({
    prompt,
    maxTokens: 2048,
    temperature: 0.3,
  });

  let raw: RawBusiness[] = [];
  try {
    const parsed = JSON.parse(extractJsonArray(text));
    if (Array.isArray(parsed)) raw = parsed as RawBusiness[];
  } catch {
    raw = [];
  }

  const seen = new Set<string>();
  const candidates: OsmCandidate[] = [];

  for (const b of raw) {
    const name = (b.nome || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const phone = b.telefono ? normalizePhone(b.telefono) : undefined;
    const label = (b.categoria || (categoryLabels[0] ?? "Attivita")).trim();

    candidates.push({
      osmId: "ai/" + slugify(name + "-" + (b.citta || cityName)),
      name,
      category: "altro",
      categoryLabel: label,
      lat,
      lng,
      addressFull: b.indirizzo ? b.indirizzo.trim() : undefined,
      city: (b.citta || cityName).trim(),
      postalCode: undefined,
      phone,
      whatsapp: undefined,
      email: undefined,
      website: undefined,
      instagram: undefined,
      facebook: undefined,
      tiktok: undefined,
      hasWebsite: false,
      hasSocial: false,
    });
  }

  return { candidates, used: true, provider };
}
