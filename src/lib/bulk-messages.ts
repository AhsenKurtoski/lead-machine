// Costruisce in automatico il messaggio email giusto per ogni lead:
// - se HA gia un sito web -> proposta di restyling/miglioramento a pochi euro
// - se NON ha un sito web -> proposta di creazione di un nuovo sito
// Messaggi deterministici (senza AI) per essere affidabili anche in invio massivo.

import type { LeadLike } from "@/lib/templates";
import { variantFor } from "@/lib/ab";

export type BulkLead = LeadLike & {
  hasWebsite?: boolean | null;
  website?: string | null;
  websiteStatus?: string | null;
};

export type BulkEmail = {
  subject: string;
  body: string;
  kind: "con_sito" | "senza_sito";
};

function signature(settings: Record<string, string>): string {
  const owner = (settings.brand_owner ?? "").trim();
  const brand = (settings.brand_name ?? "").trim();
  const phone = (settings.brand_phone ?? "").trim();
  const email = (settings.brand_email ?? "").trim();
  const lines: string[] = [];
  const who = [owner, brand].filter(Boolean).join(" - ");
  if (who) lines.push(who);
  if (phone) lines.push("Tel: " + phone);
  if (email) lines.push("Email: " + email);
  return lines.length ? "\n\n" + lines.join("\n") : "";
}

function leadName(lead: BulkLead): string {
  return (lead.name ?? "").trim() || "la vostra attivita";
}

// Chiave stabile per assegnare la variante A/B in modo deterministico.
function leadKey(lead: BulkLead): string {
  const id = (lead as { id?: string }).id;
  return id ?? (lead.name ?? "") + "|" + (lead.city ?? "");
}

function catCity(lead: BulkLead): { cat: string; city: string } {
  const cat = ((lead.subcategory ?? lead.category) ?? "").trim();
  const city = (lead.city ?? "").trim();
  return { cat, city };
}

// Considera "con sito" se il flag e attivo oppure se e presente un URL.
export function hasUsableWebsite(lead: BulkLead): boolean {
  if (lead.hasWebsite) return true;
  const w = (lead.website ?? "").trim();
  return w.length > 0;
}

export function buildBulkEmail(
  lead: BulkLead,
  settings: Record<string, string>,
): BulkEmail {
  const name = leadName(lead);
  const { cat, city } = catCity(lead);
  const sig = signature(settings);
  const inCity = city ? " a " + city : "";
  const ofCat = cat ? " di " + cat : "";
  const variant = variantFor(leadKey(lead));

  if (hasUsableWebsite(lead)) {
    if (variant === "B") {
      const subject = name + ": il vostro sito puo rendere di piu";
      const body =
        "Buongiorno,\n\n" +
        "mi presento: aiuto le attivita" + inCity + " a sfruttare meglio il proprio sito. " +
        "Quello di " + name + ofCat + " e gia un buon punto di partenza, ma con pochi ritocchi " +
        "(velocita, versione per cellulare e visibilita su Google) potrebbe portarvi piu richieste.\n\n" +
        "Preparo gratis un paio di proposte concrete e ve le mostro senza impegno: " +
        "bastano cinque minuti per capire se fa al caso vostro.\n\n" +
        "Resto a disposizione!" +
        sig;
      return { subject, body, kind: "con_sito" };
    }
    const subject = "Un'idea per migliorare il sito di " + name;
    const body =
      "Ciao,\n\n" +
      "ho dato un'occhiata al sito di " + name + ofCat + inCity + ": una bella realta. " +
      "Ho notato pero qualche piccolo dettaglio che, sistemato, potrebbe portarvi piu contatti: " +
      "un caricamento piu veloce, una versione per cellulare piu curata e qualche accorgimento " +
      "per farvi trovare meglio su Google.\n\n" +
      "Sono interventi rapidi e a costo contenuto (si parte da poche decine di euro), " +
      "non un rifacimento completo. Se vi va, preparo gratis un paio di proposte concrete " +
      "e ve le mostro senza impegno.\n\n" +
      "Fatemi sapere, a presto!" +
      sig;
    return { subject, body, kind: "con_sito" };
  }

  if (variant === "B") {
    const subject = name + ": vi trovano i clienti online?";
    const body =
      "Buongiorno,\n\n" +
      "oggi quasi tutti cercano su Google prima di scegliere. " +
      "Ho notato che " + name + " non ha ancora un sito proprio: e un'occasione persa " +
      "per farsi trovare da nuovi clienti" + inCity + ".\n\n" +
      "Mi occupo di siti semplici e curati per le piccole attivita, a costi accessibili. " +
      "Posso prepararvi un'anteprima gratuita e senza impegno, cosi vedete subito il risultato.\n\n" +
      "Se vi va, rispondete pure: ve la invio volentieri!" +
      sig;
    return { subject, body, kind: "senza_sito" };
  }

  const subject = "Un sito web per " + name + "?";
  const body =
    "Ciao,\n\n" +
    "mi occupo di siti web per attivita locali" + inCity + " e ho notato che " + name +
    " non ha ancora un sito proprio. Oggi molti clienti cercano prima online: " +
    "un sito semplice e curato aiuta a farsi trovare su Google, mostrare orari e servizi " +
    "e ricevere piu richieste.\n\n" +
    "Ho preparato un'idea su misura per voi e posso mostrarvi un'anteprima gratuita, " +
    "senza impegno. Si parte da soluzioni economiche pensate per le piccole attivita.\n\n" +
    "Se vi interessa rispondete pure a questa email, vi invio l'anteprima!" +
    sig;
  return { subject, body, kind: "senza_sito" };
}

// ---------------------------------------------------------------------------
// WhatsApp automatico: messaggio breve, personale e persuasivo (sempre in
// prima persona "io", mai "noi"), pronto per essere inviato con un click via
// wa.me. Deterministico, cosi e affidabile anche in invio massivo.

export type BulkWhatsApp = {
  body: string;
  kind: "con_sito" | "senza_sito";
};

function waOwnerIntro(settings: Record<string, string>): string {
  const owner = (settings.brand_owner ?? "").trim();
  return owner ? " Sono " + owner + "," : " Sono un web developer della zona,";
}

export function buildBulkWhatsApp(
  lead: BulkLead,
  settings: Record<string, string>,
): BulkWhatsApp {
  const name = leadName(lead);
  const { cat, city } = catCity(lead);
  const inCity = city ? " della zona di " + city : " della zona";
  const ofCat = cat ? " (" + cat + ")" : "";
  const intro = waOwnerIntro(settings);
  const variant = variantFor(leadKey(lead));

  if (hasUsableWebsite(lead)) {
    if (variant === "B") {
      const body =
        "Buongiorno " + name + "!" + intro + " mi occupo di siti web" + inCity + ". " +
        "Ho visto il vostro sito" + ofCat + " e ho un paio di idee concrete per renderlo " +
        "piu veloce, piu curato su cellulare e piu visibile su Google, con un piccolo intervento. " +
        "Vi preparo gratis e senza impegno qualche proposta: posso?";
      return { body, kind: "con_sito" };
    }
    const body =
      "Salve " + name + "! \uD83D\uDC4B" + intro + " mi occupo di siti web" + inCity + ". " +
      "Ho dato un'occhiata al vostro sito" + ofCat + ": una bella base! " +
      "Ho pero qualche idea concreta per renderlo piu veloce, piu curato su cellulare " +
      "e piu visibile su Google, con un piccolo intervento (niente rifacimento completo). " +
      "Posso preparare gratis e senza impegno un paio di proposte da mostrarvi: vi va? \uD83D\uDE0A";
    return { body, kind: "con_sito" };
  }

  if (variant === "B") {
    const body =
      "Buongiorno " + name + "!" + intro + " aiuto le attivita" + inCity +
      " a farsi trovare online. Ho notato che non avete ancora un sito e ho gia pronta " +
      "un'anteprima gratuita pensata per voi. Posso mostrarvela senza impegno?";
    return { body, kind: "senza_sito" };
  }

  const body =
    "Salve " + name + "! \uD83D\uDC4B" + intro + " mi occupo di siti web per le attivita" + inCity + ". " +
    "Ho notato che " + name + " non ha ancora un sito proprio e ho preparato apposta " +
    "un'anteprima gratuita pensata per voi. " +
    "Oggi i clienti cercano prima online: un sito curato aiuta a farsi trovare, " +
    "mostrare orari e servizi e ricevere piu richieste. " +
    "Posso mostrarvi l'anteprima senza impegno: vi va se ve la invio? \uD83D\uDE0A";
  return { body, kind: "senza_sito" };
}
