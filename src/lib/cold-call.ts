// ============================================================
// Generatore di SCRIPT per le telefonate a freddo (cold call).
// Deterministico: funziona sempre, senza AI e senza simulazioni.
// Parla in prima persona (sei tu/la tua agenzia che chiami) ed e su misura
// per il singolo lead. Due varianti: chi ha gia un sito (restyling) e chi non
// ce l'ha (nuovo sito + anteprima gratuita).
// ============================================================

export type ColdCallLead = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
  hasWebsite?: boolean | null;
  website?: string | null;
  websiteStatus?: string | null;
  googleRating?: number | null;
  googleReviews?: number | null;
};

export type ColdCallObjection = { obiezione: string; risposta: string };
export type ColdCallSection = { title: string; lines: string[] };
export type ColdCallScript = {
  kind: "con_sito" | "senza_sito";
  leadName: string;
  callerName: string;
  phone: string;
  sections: ColdCallSection[];
  objections: ColdCallObjection[];
};

function caller(settings: Record<string, string>): string {
  return settings.brand_owner || settings.brand_name || "il mio nome";
}
function brand(settings: Record<string, string>): string {
  return settings.brand_name || "la mia web agency";
}

function leadName(lead: ColdCallLead): string {
  return (lead.name || "").trim() || "l'attivita";
}
function catCity(lead: ColdCallLead): { cat: string; city: string } {
  return {
    cat: (lead.subcategory || lead.category || "attivita").toLowerCase(),
    city: lead.city || "Feltre",
  };
}

// Indica se il sito esistente e "usabile" (quindi proponi un restyling).
export function leadHasUsableWebsite(lead: ColdCallLead): boolean {
  if (!lead.hasWebsite) return false;
  if (!lead.website) return false;
  const st = (lead.websiteStatus || "").toLowerCase();
  if (st.includes("offline") || st.includes("non ragg") || st.includes("errore") || st.includes("down")) {
    return false;
  }
  return true;
}

export function buildColdCallScript(
  lead: ColdCallLead,
  settings: Record<string, string>,
): ColdCallScript {
  const name = leadName(lead);
  const { cat, city } = catCity(lead);
  const me = caller(settings);
  const ag = brand(settings);
  const myPhone = settings.brand_phone || "";
  const phone = lead.mobile || lead.phone || "";
  const conSito = leadHasUsableWebsite(lead);

  const apertura: ColdCallSection = {
    title: "1. Apertura (i primi 10 secondi)",
    lines: [
      "Buongiorno, parlo con " + name + "? Sono " + me + " di " + ag + ".",
      "La chiamo velocemente, mi prendo solo un minuto: posso?",
      "(Tono calmo, sorridente, sicuro. Aspetta il si prima di continuare.)",
    ],
  };

  const gancio: ColdCallSection = conSito
    ? {
        title: "2. Il motivo della chiamata (il gancio)",
        lines: [
          "Ho visto la vostra attivita qui a " + city + " e ho dato un'occhiata al vostro sito.",
          "Mi occupo di siti per le attivita della zona e ho notato un paio di cose che, sistemate, vi potrebbero portare piu clienti dal telefono e da Google.",
          "Volevo proporvi un piccolo restyling per renderlo piu moderno e veloce, soprattutto da cellulare.",
        ],
      }
    : {
        title: "2. Il motivo della chiamata (il gancio)",
        lines: [
          "Ho cercato " + name + " online e ho visto che non avete (o quasi) un sito vostro.",
          "Mi occupo di siti per le attivita di " + city + " e zona. Oggi chi non vi trova su Google spesso sceglie un concorrente che ha il sito.",
          "Per farvi capire cosa intendo, vi ho gia preparato GRATIS un'anteprima di sito su misura per " + name + ": volevo mostrarvela.",
        ],
      };

  const valore: ColdCallSection = conSito
    ? {
        title: "3. Il valore (cosa ottiene)",
        lines: [
          "In pratica vi rifaccio il sito con un look attuale, che si apre bene da telefono e in fretta.",
          "Aggiungo il pulsante WhatsApp e il tasto chiama, il modulo per le richieste e la posizione su Google Maps.",
          "Lo curo io dall'inizio alla fine, e parto da cifre molto contenute: l'idea e che si ripaghi da solo con i nuovi contatti.",
        ],
      }
    : {
        title: "3. Il valore (cosa ottiene)",
        lines: [
          "Vi faccio un sito professionale, su misura per " + cat + ", che funziona perfettamente da cellulare.",
          "Dentro c'e il pulsante per chiamarvi, WhatsApp diretto, il modulo richieste, gli orari, le foto e la mappa.",
          "Serve a farvi trovare su Google e a trasformare chi vi cerca in clienti. E parto da cifre molto contenute.",
          (lead.googleRating ? "(Avete gia " + lead.googleRating + "/5 su Google: sfrutto le vostre recensioni per dare ancora piu fiducia.)" : ""),
        ].filter(Boolean) as string[],
      };

  const chiusura: ColdCallSection = {
    title: "5. La chiusura (chiedi l'appuntamento)",
    lines: [
      conSito
        ? "Le propongo questo: le mando su WhatsApp o via email un paio di esempi e una proposta. Le va meglio oggi pomeriggio o domani mattina?"
        : "Le propongo questo: le mando subito il link dell'anteprima che ho preparato per voi, cosi la guarda con calma. Mi lascia il numero WhatsApp giusto o l'email?",
      "Perfetto. Quando l'ha vista, ci sentiamo 5 minuti per capire se fa al caso vostro. Le va bene se la richiamo " + (conSito ? "domani" : "tra un paio di giorni") + "?",
      (myPhone ? "Le lascio anche il mio numero per qualsiasi cosa: " + myPhone + "." : ""),
      "La ringrazio del tempo, " + name + ". Buona giornata!",
    ].filter(Boolean) as string[],
  };

  const promemoria: ColdCallSection = {
    title: "Promemoria prima di chiamare",
    lines: [
      "Orario migliore: per i negozi/uffici 10:00-12:00 o 15:00-17:00; per bar e ristoranti evita gli orari di servizio.",
      "Obiettivo della chiamata: NON vendere al telefono, ma ottenere il permesso di mandare l'anteprima/proposta e fissare un secondo contatto.",
      "Parla lentamente, fai pause, ascolta. Annota tutto e poi segna l'esito qui nel CRM.",
      phone ? ("Numero da chiamare: " + phone) : "Numero non disponibile per questo lead.",
    ],
  };

  const objections: ColdCallObjection[] = [
    {
      obiezione: "Non mi interessa / non ho tempo",
      risposta:
        "Capisco benissimo, le rubo davvero un attimo. Le mando solo il link da guardare quando ha 30 secondi, senza impegno. Mi dice il numero giusto?",
    },
    {
      obiezione: "Quanto costa?",
      risposta:
        "Dipende da cosa serve, ma parto da cifre molto basse e pensate apposta per le piccole attivita. Prima le mostro il lavoro, poi le faccio un preventivo chiaro e senza sorprese.",
    },
    {
      obiezione: conSito ? "Ho gia un sito" : "Ho gia la pagina Facebook/Instagram",
      risposta: conSito
        ? "Esatto, ed e proprio per questo che la chiamo: vi do una rinfrescata per renderlo piu moderno e veloce da telefono, dove ormai guardano quasi tutti."
        : "I social sono ottimi, ma il sito e casa vostra: vi trovano su Google, raccoglie le richieste e da piu fiducia. Lavorano benissimo insieme.",
    },
    {
      obiezione: "Ci penso / mi richiami",
      risposta:
        "Volentieri. Intanto le mando il link cosi nel frattempo se lo guarda, poi la richiamo io " + (conSito ? "domani" : "tra un paio di giorni") + ". A che ora la disturbo di meno?",
    },
    {
      obiezione: "Come ha avuto il mio numero?",
      risposta:
        "E un numero pubblico dell'attivita, l'ho trovato online. La contatto solo per proporle questa cosa, se non le interessa la saluto subito.",
    },
  ];

  return {
    kind: conSito ? "con_sito" : "senza_sito",
    leadName: name,
    callerName: me,
    phone,
    sections: [apertura, gancio, valore, chiusura, promemoria],
    objections,
  };
}

// Testo piatto dello script (utile per copia-incolla e per l'AI come base).
export function coldCallScriptToText(s: ColdCallScript): string {
  const parts: string[] = [];
  for (const sec of s.sections) {
    parts.push(sec.title);
    for (const l of sec.lines) parts.push("  " + l);
    parts.push("");
  }
  parts.push("4. Gestione delle obiezioni");
  for (const o of s.objections) {
    parts.push("  - Se dice: " + o.obiezione);
    parts.push("    Rispondi: " + o.risposta);
  }
  return parts.join("\n");
}
