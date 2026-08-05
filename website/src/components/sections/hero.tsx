"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Github,
  TrendingUp,
  MessageCircle,
  CheckCircle2,
  Star,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GITHUB_REPO } from "@/lib/site";
import { Reveal } from "@/components/sections/reveal";

const STATS = [
  { key: "businesses", value: "40" },
  { key: "countries", value: "37+" },
  { key: "languages", value: "7" },
  { key: "price", value: "€0" },
] as const;

export function Hero() {
  const t = useTranslations();

  return (
    <section className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="container">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <Reveal>
            <Badge
              variant="gradient"
              className="gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("hero.eyebrow")}
            </Badge>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {t("hero.title")}{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500">
                {t("hero.titleHighlight")}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("hero.subtitle")}
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild variant="gradient" size="xl" className="w-full sm:w-auto">
                <Link href="/deploy">
                  {t("hero.ctas.primary")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl" className="w-full sm:w-auto">
                <Link href="/demo">
                  <Sparkles className="h-5 w-5 text-fuchsia-500" />
                  {t("hero.ctas.secondary")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="w-full sm:w-auto bg-background/60 backdrop-blur"
              >
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-5 w-5" />
                  {t("hero.ctas.tertiary")}
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map((s) => (
                <div
                  key={s.key}
                  className="glassmorphism flex flex-col items-center gap-1 rounded-xl px-4 py-4"
                >
                  <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 sm:text-3xl">
                    {s.value}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground leading-tight">
                    {t(`hero.stats.${s.key}`)}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={500}>
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </span>
              {t("hero.trust.text")}{" "}
              <span className="font-semibold text-foreground">
                {t("hero.trust.countries")}
              </span>
            </p>
          </Reveal>
        </div>

        <Reveal delay={600} className="relative mx-auto mt-14 max-w-5xl sm:mt-20">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />
          <div className="mockup-frame">
            <img
              src="/product-screenshots/screenshot-demo.png"
              alt="Lead Machine live demo in the browser"
              className="w-full rounded-lg"
              width={1440}
              height={900}
            />
          </div>

          <div className="glassmorphism absolute -top-5 -left-3 hidden items-center gap-3 rounded-xl px-4 py-3 sm:flex lg:-left-10">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-lg font-bold leading-none">92</p>
              <p className="text-[10px] font-medium text-muted-foreground">
                Lead score
              </p>
            </div>
          </div>

          <div className="glassmorphism absolute -bottom-5 -right-3 hidden items-center gap-3 rounded-xl px-4 py-3 sm:flex lg:-right-10">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <MessageCircle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="flex items-center gap-1 text-sm font-bold leading-none">
                WhatsApp
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </p>
              <p className="text-[10px] font-medium text-muted-foreground">
                Ready to send
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
