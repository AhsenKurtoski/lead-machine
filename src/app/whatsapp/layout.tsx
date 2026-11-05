import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

// `page.tsx` e' un componente client ("use client") e Next non permette di
// esportare `metadata` da li': il titolo e il canonical della rotta stanno nel
// layout, che resta un componente server.
export const metadata: Metadata = buildPageMetadata({
  path: "/whatsapp",
  title: "WhatsApp automatico",
  description:
    "Il messaggio giusto e gia pronto per ogni attivita: apri WhatsApp e premi invio.",
});

export default function WhatsAppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
