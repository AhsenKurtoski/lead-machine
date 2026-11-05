import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

// `page.tsx` e' un componente client ("use client") e Next non permette di
// esportare `metadata` da li': il titolo e il canonical della rotta stanno nel
// layout, che resta un componente server.
export const metadata: Metadata = buildPageMetadata({
  path: "/impostazioni",
  title: "Impostazioni",
  description: "Dati del tuo brand, esportazione e importazione dei lead e backup del database.",
});

export default function ImpostazioniLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
