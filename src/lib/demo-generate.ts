// ============================================================
// Generatore del sito vetrina con AI (logica condivisa).
// Usato sia dalla route /api/demo/generate sia dalla pagina /demo/[id]
// (auto-generazione al primo accesso). Produce un sito UNICO, premium e
// su misura per ogni attivita: layout, palette e contenuti cambiano in
// base ai dati reali del lead, cosi non escono mai "sempre gli stessi siti".
// ============================================================

import { generateText } from "@/lib/ai";

export type DemoLeadLike = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
  addressFull: string | null;
  city: string | null;
  googleRating: number | null;
  googleReviews: number | null;
};

export type DemoGenResult = { html: string; provider: string };

export const DEMO_SYSTEM_PROMPT =
  "Sei un web designer e front-end developer di livello altissimo (top 1%), specializzato in siti vetrina premium per piccole attivita locali italiane. " +
  "I tuoi siti sembrano realizzati da un'agenzia da migliaia di euro: design moderno 2025, micro-interazioni in CSS, sezioni complete e curate nei dettagli. " +
  "Ogni sito che crei e DIVERSO dagli altri: cambi layout, palette, tipografia e composizione in base all'attivita, senza mai riutilizzare lo stesso schema. " +
  "Produci codice HTML pulito, semanticamente corretto, accessibile e completamente funzionante. Scrivi sempre in italiano corretto con gli accenti giusti. " +
  "Restituisci ESCLUSIVAMENTE un documento HTML completo e valido, senza spiegazioni e senza blocchi markdown.";

const LAYOUT_VARIANTS = [
  "STILE EDITORIALE ELEGANTE: hero con titolo grande allineato a sinistra e ampi spazi, sezioni che alternano sfondo chiaro e tinte tenui del colore principale, molta aria e tipografia raffinata.",
  "STILE MODERNO AUDACE: hero a tutta altezza con gradiente deciso e titolo centrato di grande impatto, card con ombre marcate e angoli molto arrotondati, sezioni dinamiche e contrastate.",
  "STILE CALDO E ACCOGLIENTE: tonalita morbide e avvolgenti, forme arrotondate, immagini grandi e protagoniste, atmosfera familiare e rassicurante.",
  "STILE MINIMAL PREMIUM: moltissimo spazio bianco, linee sottili, pochi colori ma eleganti, dettagli curati e tipografia di lusso, sensazione di esclusivita.",
  "STILE CONTEMPORANEO VIVACE: accenti di colore brillanti, sezioni a griglia asimmetrica, badge e pill colorate, look fresco e giovane ma professionale.",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function buildDemoPrompt(
  lead: DemoLeadLike,
  brandName: string,
  brandOwner: string,
  bookingEmail: string,
  customPrompt: string,
): string {
  const phone = lead.mobile || lead.phone || "";
  const wa = lead.whatsapp ? "https://wa.me/" + lead.whatsapp : "";
  const rating = lead.googleRating
    ? "- Valutazione Google: " + lead.googleRating + "/5 su " + (lead.googleReviews ?? 0) + " recensioni"
    : "- Valutazione Google: non disponibile";
  const brandLine =
    "Anteprima dimostrativa - proposta da " + brandName + (brandOwner ? " (" + brandOwner + ")" : "");
  const formAction = bookingEmail ? "https://formsubmit.co/" + bookingEmail : "";
  const mapQ = encodeURIComponent(
    ((lead.addressFull ? lead.addressFull + " " : "") + (lead.city || "Feltre")) || lead.name || "Feltre"
  );
  const variant = LAYOUT_VARIANTS[hashString(lead.id || lead.name || "x") % LAYOUT_VARIANTS.length];

  const lines = [
    "Crea un sito vetrina monopagina PREMIUM, moderno ed elegante per questa attivita locale.",
    "",
    "DATI REALI (usa SOLO questi, non inventare contatti o indirizzi):",
    "- Nome attivita: " + (lead.name || "-"),
    "- Categoria: " + (lead.subcategory || lead.category || "-"),
    "- Citta: " + (lead.city || "Feltre"),
    "- Indirizzo: " + (lead.addressFull || "non disponibile"),
    "- Telefono: " + (phone || "non disponibile"),
    "- Link WhatsApp: " + (wa || "non disponibile"),
    "- Email: " + (lead.email || "non disponibile"),
    rating,
    "",
    "DIREZIONE CREATIVA OBBLIGATORIA PER QUESTA ATTIVITA (rendila unica, NON riusare lo stesso schema di altri siti):",
    "- " + variant,
    "- Scegli i contenuti, i titoli e i testi delle sezioni in modo specifico per '" + (lead.name || "l'attivita") + "' e per la sua categoria. Niente testi generici validi per qualsiasi attivita.",
  ];

  if (customPrompt && customPrompt.trim()) {
    lines.push(
      "",
      "ISTRUZIONI PRIORITARIE DEL CLIENTE (rispettale con la massima attenzione, hanno precedenza sui requisiti generici qui sotto):",
      customPrompt.trim()
    );
  }

  lines.push(
    "",
    "REQUISITI DI DESIGN (qualita premium, livello 2025):",
    "- Tipografia curata, ampi spazi bianchi, gerarchia visiva chiara, dettagli eleganti.",
    "- Definisci variabili CSS in :root per la palette e i raggi degli angoli e usale ovunque; cura gli stati hover e focus dei pulsanti e delle card con transizioni morbide (transition + transform); abbina un font elegante per i titoli e uno leggibile per il testo (entrambi da Google Fonts).",
    "- Scegli una palette di colori COERENTE con la categoria e DIVERSA per ogni attivita (usa il nome come ispirazione). Non usare sempre gli stessi colori.",
    "- Sezioni: header con nav fissa, hero a tutta larghezza con titolo + 2 call-to-action, barra punti di forza, sezione 'Chi siamo', griglia servizi (da 3 a 6), recensioni/testimonianze (usa la valutazione Google se presente), sezione prenotazione/contatti, footer.",
    "- Mobile-first e responsive con CSS reale (media query). NIENTE framework esterni, NIENTE CDN JS, NIENTE JavaScript di terze parti.",
    "- Tutto il CSS in un unico tag <style> nel <head>. Puoi usare Google Fonts via <link>. Puoi usare emoji come icone.",
    "- I pulsanti devono essere FUNZIONANTI: telefono con href tel:, WhatsApp con il link wa.me fornito, email con mailto:. Ometti i pulsanti per i contatti non disponibili."
  );

  lines.push(
    "",
    "FUNZIONALITA AVANZATE OBBLIGATORIE (rendono il sito completo, perfetto e professionale):",
    "1) GALLERIA FOTOGRAFICA: una sezione con 6 immagini in griglia responsive. Usa immagini reali gratuite Picsum nel formato 'https://picsum.photos/seed/PAROLA/640/420', cambiando PAROLA per ogni foto (es. nome attivita senza spazi + numero). Aggiungi loading='lazy', object-fit:cover e angoli arrotondati.",
    "2) SEZIONE FAQ: 4-5 domande frequenti pertinenti alla categoria, realizzate con elementi <details>/<summary> (accordion che funziona SENZA JavaScript).",
    "3) MAPPA GOOGLE INTEGRATA: un <iframe> con src='https://www.google.com/maps?q=" + mapQ + "&output=embed' (senza API key), larghezza piena, altezza ~300px, angoli arrotondati e loading='lazy'.",
    "4) ORARI DI APERTURA in una piccola tabella/lista (orari verosimili, indicativi) PIU un PULSANTE WHATSAPP FLOTTANTE fisso in basso a destra (position:fixed) con il link wa.me fornito. Ometti il pulsante se WhatsApp non e disponibile.",
    "5) SEO + DATI STRUTTURATI: nel <head> inserisci <title> ottimizzato, <meta name='description'>, meta Open Graph (og:title, og:description, og:type=website) e uno <script type='application/ld+json'> con schema LocalBusiness (name, telephone, email, address con addressLocality e addressCountry='IT'). Aggiungi scroll fluido con 'html scroll-behavior:smooth' e un piccolo pulsante 'Torna su' (link ad #home)."
  );

  if (formAction) {
    lines.push(
      "",
      "MODULO DI PRENOTAZIONE FUNZIONANTE (OBBLIGATORIO, via FormSubmit, senza JavaScript):",
      "- Inserisci una sezione 'Prenota / Richiedi informazioni' con un <form> HTML reale.",
      "- Il form deve avere method='POST' e action='" + formAction + "'.",
      "- Campi visibili: Nome e cognome (name='nome'), Email (name='email', type=email), Telefono (name='telefono'), Data e numero persone o servizio richiesto (name='richiesta'), Messaggio (name='messaggio', textarea).",
      "- Aggiungi questi input nascosti: input hidden name='_captcha' value='false', input hidden name='_subject' value='Nuova richiesta dal sito " + (lead.name || "") + "', input hidden name='_template' value='table'.",
      "- Pulsante di invio ben visibile e in stile premium. Il form deve funzionare anche senza JavaScript."
    );
  }

  lines.push(
    "- In cima alla pagina inserisci una piccola barra discreta con il testo: '" + brandLine + "'.",
    "- Nel footer scrivi 'Sito dimostrativo realizzato da " + brandName + "'.",
    "- Testi realistici e professionali in italiano, coerenti con la categoria. Vietato il lorem ipsum.",
    "",
    "Restituisci SOLO il codice HTML completo (da <!DOCTYPE html> a </html>), nient'altro."
  );
  return lines.join("\n");
}

export function extractHtml(raw: string): string {
  let t = (raw || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  const lower = t.toLowerCase();
  const doc = lower.indexOf("<!doctype");
  const htmlTag = lower.indexOf("<html");
  const start = doc >= 0 ? doc : htmlTag;
  if (start > 0) t = t.slice(start);
  const end = t.toLowerCase().lastIndexOf("</html>");
  if (end >= 0) t = t.slice(0, end + 7);
  return t.trim();
}

// Genera il sito con un piccolo retry. Restituisce null se l'output non e un
// documento HTML completo. Propaga gli errori dell'AI (incluso NO_AI_KEYS).
export async function generateDemoHtml(
  lead: DemoLeadLike,
  brandName: string,
  brandOwner: string,
  bookingEmail: string,
  customPrompt: string,
): Promise<DemoGenResult | null> {
  const prompt = buildDemoPrompt(lead, brandName, brandOwner, bookingEmail, customPrompt);
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await generateText({
      system: DEMO_SYSTEM_PROMPT,
      prompt,
      maxTokens: 8192,
      temperature: attempt === 0 ? 0.9 : 0.6,
    });
    const candidate = extractHtml(result.text);
    if (
      candidate &&
      candidate.length >= 600 &&
      candidate.toLowerCase().includes("<html") &&
      candidate.toLowerCase().includes("</html>")
    ) {
      return { html: candidate, provider: result.provider };
    }
  }
  return null;
}
