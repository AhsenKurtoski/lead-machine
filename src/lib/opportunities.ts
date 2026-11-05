// ============================================================
// Coda delle OPPORTUNITA: chi ha piu bisogno di un sito web.
//
// Logica PURA (nessun accesso al DB) cosi resta testabile e
// riusabile sia lato server sia lato client.
// ============================================================

import { computeScore } from "./scoring";

export type OpportunityLead = {
  id: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  city?: string | null;
  hasWebsite: boolean;
  website?: string | null;
  websiteStatus?: string | null;
  hasSocial: boolean;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  googleRating?: number | null;
  googleReviews?: number | null;
  status?: string | null;
  priorityScore?: number | null;
};

export type Opportunity = {
  lead: OpportunityLead;
  score: number;
  reason: string;
  withoutWebsite: boolean;
  contactable: boolean;
};

/** Nessun sito: ne dichiarato dai flag, ne un URL salvato. */
export function hasNoWebsite(lead: OpportunityLead): boolean {
  const url = (lead.website ?? "").trim();
  return !lead.hasWebsite && url.length === 0;
}

/** Possiamo raggiungerla con almeno un canale (telefono, WhatsApp o email). */
export function isContactable(lead: OpportunityLead): boolean {
  return Boolean(
    (lead.whatsapp ?? "").trim() || (lead.email ?? "").trim() || (lead.phone ?? "").trim()
  );
}

/** Punteggio di opportunita: riusa lo scoring del prodotto (0-100). */
export function scoreOpportunity(lead: OpportunityLead): { score: number; reason: string } {
  return computeScore({
    hasWebsite: !hasNoWebsite(lead),
    hasSocial: lead.hasSocial,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    email: lead.email,
    website: lead.website,
    websiteStatus: lead.websiteStatus,
    googleRating: lead.googleRating,
    googleReviews: lead.googleReviews,
  });
}

/**
 * Coda ordinata: prima chi NON ha un sito e possiamo contattare subito,
 * poi il resto in ordine di punteggio. Il nome e il criterio di spareggio,
 * cosi l'ordine e sempre deterministico.
 */
export function buildOpportunities(leads: OpportunityLead[]): Opportunity[] {
  const items: Opportunity[] = leads.map((lead) => {
    const { score, reason } = scoreOpportunity(lead);
    return { lead, score, reason, withoutWebsite: hasNoWebsite(lead), contactable: isContactable(lead) };
  });

  return items.sort((a, b) => {
    if (a.withoutWebsite !== b.withoutWebsite) return a.withoutWebsite ? -1 : 1;
    if (a.contactable !== b.contactable) return a.contactable ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.lead.name.localeCompare(b.lead.name);
  });
}

export type OpportunityFilters = {
  city?: string;
  category?: string;
  search?: string;
  onlyContactable?: boolean;
  onlyWithoutWebsite?: boolean;
};

/** Applica i filtri della pagina. Tutti opzionali e combinabili. */
export function filterOpportunities(
  items: Opportunity[],
  filters: OpportunityFilters
): Opportunity[] {
  const city = (filters.city ?? "").trim().toLowerCase();
  const category = (filters.category ?? "").trim().toLowerCase();
  const search = (filters.search ?? "").trim().toLowerCase();

  return items.filter((it) => {
    if (filters.onlyWithoutWebsite && !it.withoutWebsite) return false;
    if (filters.onlyContactable && !it.contactable) return false;
    if (city && (it.lead.city ?? "").trim().toLowerCase() !== city) return false;
    if (category && (it.lead.category ?? "").trim().toLowerCase() !== category) return false;
    if (search) {
      const haystack = [it.lead.name, it.lead.category, it.lead.subcategory, it.lead.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export type OpportunityStats = {
  total: number;
  withoutWebsite: number;
  contactableWithoutWebsite: number;
};

export function opportunityStats(items: Opportunity[]): OpportunityStats {
  const withoutWebsite = items.filter((i) => i.withoutWebsite);
  return {
    total: items.length,
    withoutWebsite: withoutWebsite.length,
    contactableWithoutWebsite: withoutWebsite.filter((i) => i.contactable).length,
  };
}

/** Etichette leggibili per lo stato CRM (usate nella coda). */
export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  NUOVO: "Nuova",
  CONTATTATO: "Contattata",
  IN_TRATTATIVA: "In trattativa",
  CLIENTE: "Cliente",
  SCARTATO: "Scartata",
};

export function opportunityStatusLabel(status?: string | null): string {
  const key = (status ?? "NUOVO").toUpperCase();
  return OPPORTUNITY_STATUS_LABELS[key] ?? key;
}
