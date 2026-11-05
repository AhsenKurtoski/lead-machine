import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

// La pagina di questa rotta e' un componente client ("use client") e Next non
// permette di esportare `metadata` da li: il canonical della pagina sta quindi
// nel layout della rotta, che non aggiunge markup.
export const metadata: Metadata = buildPageMetadata({
  path: "/mappa",
  title: "Mappa lead",
  description: "I lead geolocalizzati sulla mappa, con priorita e filtri per stato e categoria.",
});

export default function MappaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
