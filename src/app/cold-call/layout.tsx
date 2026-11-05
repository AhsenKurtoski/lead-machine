import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

// `page.tsx` e' un componente client ("use client") e Next non permette di
// esportare `metadata` da li': il titolo e il canonical della rotta stanno nel
// layout, che resta un componente server.
export const metadata: Metadata = buildPageMetadata({
  path: "/cold-call",
  title: "Script per telefonate (Cold Call)",
  description:
    "Per ogni lead uno script pronto e su misura: chiami, leggi e fissi l'appuntamento.",
});

export default function ColdCallLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
