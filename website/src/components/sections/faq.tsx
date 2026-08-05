"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";

export function Faq() {
  const t = useTranslations("pricing");

  return (
    <section id="faq" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="container">
        <Reveal>
          <SectionHeader title={t("faq.title")} />
        </Reveal>

        <Reveal delay={150}>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border/60 bg-card/70 p-2 backdrop-blur sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              {Array.from({ length: 5 }).map((_, i) => (
                <AccordionItem key={i} value={`q${i + 1}`} className="px-2">
                  <AccordionTrigger className="text-left text-base font-semibold">
                    {t(`faq.q${i + 1}`)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="leading-relaxed">{t(`faq.a${i + 1}`)}</p>
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
