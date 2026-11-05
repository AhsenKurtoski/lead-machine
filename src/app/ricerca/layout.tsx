import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

// La pagina di questa rotta e' un componente client ("use client") e Next non
// permette di esportare `metadata` da li: il canonical della pagina sta quindi
// nel layout della rotta, che non aggiunge markup.
export const metadata: Metadata = buildPageMetadata({
  path: "/ricerca",
  title: "Ricerca lead",
  description:
    "Cerca attivita locali per categoria e zona su OpenStreetMap e Geoapify, poi salvale nel CRM.",
});

export default function RicercaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
