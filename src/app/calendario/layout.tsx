import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

// `page.tsx` e' un componente client ("use client") e Next non permette di
// esportare `metadata` da li': il titolo e il canonical della rotta stanno nel
// layout, che resta un componente server.
export const metadata: Metadata = buildPageMetadata({
  path: "/calendario",
  title: "Calendario & Follow-up",
  description: "Promemoria di ricontatto e appuntamenti, tutto in un unico posto.",
});

export default function CalendarioLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
