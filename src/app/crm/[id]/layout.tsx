import type { Metadata } from "next";
import type { ReactNode } from "react";

// Scheda di un singolo lead: e' un record privato dell'utente, non una pagina
// da indicizzare, e senza queste regole erediterebbe il canonical di /crm.
// La pagina e' un componente client ("use client"), quindi i metadata stanno
// qui, come per le altre rotte con lo stesso vincolo.
export const metadata: Metadata = {
  title: "Scheda lead",
  robots: { index: false, follow: false },
};

export default function CrmLeadLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
