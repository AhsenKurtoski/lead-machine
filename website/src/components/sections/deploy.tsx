"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Laptop, Server, Cloud, Copy, Check, TerminalSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";

const OPTIONS = [
  { key: "local", icon: Laptop, steps: 3 },
  { key: "vps", icon: Server, steps: 3 },
  { key: "serverless", icon: Cloud, steps: 3 },
] as const;

function CopyStep({ text, label }: { text: string; label: string }) {
  const addToast = useToast();
  const [copied, setCopied] = React.useState(false);
  const t = useTranslations("deploy");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    addToast({ title: t("copied"), variant: "success" });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2.5">
      <TerminalSquare className="h-4 w-4 shrink-0 text-indigo-500" />
      <code className="flex-1 truncate text-xs font-mono text-foreground/90">
        {text}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

export function DeploySection() {
  const t = useTranslations("deploy");

  return (
    <section id="deploy" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-0 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/15" />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:mt-16 lg:grid-cols-3">
          {OPTIONS.map((opt, idx) => (
            <Reveal key={opt.key} delay={idx * 120}>
              <div className="card-hover flex h-full flex-col rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
                    <opt.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="gradient">{t(`options.${opt.key}.badge`)}</Badge>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {t(`options.${opt.key}.title`)}
                </h3>
                <div className="mt-4 flex flex-col gap-2">
                  {Array.from({ length: opt.steps }).map((_, i) => (
                    <CopyStep
                      key={i}
                      label={t(`options.${opt.key}.title`)}
                      text={t(`options.${opt.key}.steps.${i}`)}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {t(`options.${opt.key}.notes`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
