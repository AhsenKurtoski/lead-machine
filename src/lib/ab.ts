// A/B test dei messaggi: scegliamo in modo DETERMINISTICO la variante (A o B)
// a partire dall'id del lead. Cosi lo stesso lead riceve sempre la stessa
// versione e possiamo calcolare le performance senza salvare nulla in piu.

export type Variant = "A" | "B";

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Divide i lead in due gruppi stabili 50/50.
export function variantFor(leadId: string): Variant {
  return hashString(leadId) % 2 === 0 ? "A" : "B";
}

export const VARIANT_LABELS: Record<Variant, string> = {
  A: "Variante A",
  B: "Variante B",
};
