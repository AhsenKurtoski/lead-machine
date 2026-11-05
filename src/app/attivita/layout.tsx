import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

// `page.tsx` e' un componente client ("use client") e Next non permette di
// esportare `metadata` da li': il titolo e il canonical della rotta stanno nel
// layout, che resta un componente server.
export const metadata: Metadata = buildPageMetadata({
  path: "/attivita",
  title: "Log attivita",
  description: "Cronologia completa di tutto cio che e successo sui tuoi lead.",
});

export default function AttivitaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
