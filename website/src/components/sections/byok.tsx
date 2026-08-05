"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Github, LockKeyhole, ShieldCheck, ArrowRight, CheckCircle2, Copy, Check, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GITHUB_CLONE, GITHUB_REPO } from "@/lib/site";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";

const CLONE_COMMAND = GITHUB_CLONE;

export function ByokTabs() {
  const t = useTranslations("byok");
  const tGlobal = useTranslations();
  const addToast = useToast();
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CLONE_COMMAND);
    } catch {
      return;
    }
    setCopied(true);
    addToast({ title: tGlobal("deploy.copied"), variant: "success" });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section id="byok" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/15" />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        </Reveal>

        <Reveal delay={150} className="mt-10 sm:mt-14">
          <Tabs defaultValue="crypto" className="w-full">
            <TabsList className="mx-auto flex h-auto w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl bg-muted/60 p-1.5">
              <TabsTrigger value="crypto" className="gap-1.5 rounded-xl px-3 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:via-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white">
                <LockKeyhole className="h-4 w-4" />
                {t("tabs.crypto")}
              </TabsTrigger>
              <TabsTrigger value="zeroknowledge" className="gap-1.5 rounded-xl px-3 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:via-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white">
                <ShieldCheck className="h-4 w-4" />
                {t("tabs.zeroknowledge")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crypto">
              <div className="mx-auto max-w-3xl">
                <div className="space-y-4 text-center">
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {t("crypto.p1")}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("crypto.p2")}
                  </p>
                </div>
                <h3 className="mt-10 text-center text-lg font-semibold tracking-tight">
                  {t("crypto.stepsTitle")}
                </h3>
                <div className="mt-6 flex flex-col gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-indigo-500/25">
                        {i + 1}
                      </span>
                      <p className="min-w-0 break-words pt-1 text-sm leading-relaxed text-foreground/90 sm:text-base">
                        {t(`crypto.step${i + 1}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="zeroknowledge">
              <div className="mx-auto max-w-3xl">
                <div className="space-y-4 text-center">
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {t("zeroknowledge.p1")}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("zeroknowledge.p2")}
                  </p>
                </div>
                <h3 className="mt-10 text-center text-lg font-semibold tracking-tight">
                  {t("zeroknowledge.promisesTitle")}
                </h3>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <p className="min-w-0 break-words text-sm leading-relaxed text-foreground/90">
                        {t(`zeroknowledge.prom${i + 1}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mx-auto mt-12 flex max-w-md items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-4 py-3">
            <Terminal className="h-4 w-4 shrink-0 text-indigo-500" />
            <code className="flex-1 truncate font-mono text-xs text-foreground/90">
              {CLONE_COMMAND}
            </code>
            <button
              type="button"
              onClick={copy}
              aria-label={t("cta.verify")}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" size="lg">
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                {t("cta.verify")}
              </a>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link href="/demo">
                <Sparkles className="h-4 w-4 text-fuchsia-500" />
                {tGlobal("cta.demo")}
              </Link>
            </Button>
            <Button asChild variant="gradient" size="lg">
              <Link href="/deploy">
                {t("cta.start")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
