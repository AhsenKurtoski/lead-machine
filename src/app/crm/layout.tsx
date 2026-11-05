import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

// La pagina di questa rotta e' un componente client ("use client") e Next non
// permette di esportare `metadata` da li: il canonical della pagina sta quindi
// nel layout della rotta, che non aggiunge markup.
export const metadata: Metadata = buildPageMetadata({
  path: "/crm",
  title: "CRM",
  description:
    "Tutti i lead trovati con stato, priorita, tag e azioni massive in un unico elenco.",
});

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
