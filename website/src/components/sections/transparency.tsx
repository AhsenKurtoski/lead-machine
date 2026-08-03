"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Database,
  Cookie,
  Code2,
  ShieldAlert,
  Landmark,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";

const SECTIONS = [
  { key: "data", icon: Database },
  { key: "cookies", icon: Cookie },
  { key: "opensource", icon: Code2 },
  { key: "security", icon: ShieldAlert },
  { key: "financial", icon: Landmark },
] as const;

export function TransparencySection() {
  const t = useTranslations("transparency");

  return (
    <section id="transparency" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 right-0 h-[380px] w-[380px] rounded-full bg-fuchsia-500/10 blur-[120px] dark:bg-fuchsia-500/15" />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        </Reveal>

        <Reveal delay={150}>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border/60 bg-card/70 p-2 backdrop-blur sm:mt-14 sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              {SECTIONS.map((s) => (
                <AccordionItem key={s.key} value={s.key} className="px-2">
                  <AccordionTrigger className="gap-3 text-left">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white">
                      <s.icon className="h-4 w-4" />
                    </span>
                    <span className="text-base font-semibold">
                      {t(`sections.${s.key}Title`)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-line leading-relaxed">
                      {t(`sections.${s.key}Body`)}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
