import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

// `page.tsx` e' un componente client ("use client") e Next non permette di
// esportare `metadata` da li': il titolo e il canonical della rotta stanno nel
// layout, che resta un componente server.
export const metadata: Metadata = buildPageMetadata({
  path: "/email",
  title: "Email inviate",
  description:
    "Vedi a chi hai scritto, lo stato di ogni email e chi ha risposto. Aggiorna lo stato con un clic.",
});

export default function EmailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
