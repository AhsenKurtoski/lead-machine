import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CheckCircle2, Zap, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

const COMPARE_KEYS = [
  "research",
  "crm",
  "map",
  "quotes",
  "aiFeatures",
  "smtp",
  "whatsapp",
  "i18n",
  "selfHost",
  "offline",
  "privacy",
  "license",
] as const;

export async function Pricing({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "pricing" });

  return (
    <section id="pricing" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-0 h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px] dark:bg-fuchsia-500/15" />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:mt-16 lg:grid-cols-2">
          <Reveal delay={100}>
            <Card className="relative h-full overflow-hidden border-indigo-500/30 bg-gradient-to-b from-indigo-500/[0.07] to-transparent">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between">
                  <Badge variant="gradient" className="px-3 py-1">
                    {t("byok.badge")}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">{t("byok.price")}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    / {t("byok.period")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-balance">
                  {t("byok.headline")}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("byok.desc")}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-foreground/90"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      {t(`byok.features.${i}`)}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant="gradient" size="lg" className="w-full">
                  <Link href="/byok-lifetime">
                    <Zap className="h-4 w-4 fill-current" />
                    {t("byok.cta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </Reveal>

          <Reveal delay={200}>
            <Card className="relative h-full overflow-hidden border-violet-500/30 bg-gradient-to-b from-violet-500/[0.07] to-transparent">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
              <CardHeader className="gap-3">
                <Badge variant="secondary" className="px-3 py-1 w-fit">
                  {t("opensource.badge")}
                </Badge>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">{t("opensource.price")}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    / {t("opensource.period")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-balance">
                  {t("opensource.headline")}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("opensource.desc")}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-foreground/90"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                      {t(`opensource.features.${i}`)}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" size="lg" className="w-full border-violet-500/40 hover:bg-violet-500/10">
                  <Link href="/deploy">
                    <Server className="h-4 w-4" />
                    {t("opensource.cta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </Reveal>
        </div>

        <Reveal delay={250}>
          <div className="mx-auto mt-16 max-w-3xl sm:mt-20">
            <h3 className="text-center text-lg font-semibold tracking-tight">
              {t("compareTitle")}
            </h3>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
              {COMPARE_KEYS.map((key, i) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between gap-4 px-5 py-3.5 text-sm",
                    i % 2 === 0 && "bg-muted/30",
                  )}
                >
                  <span className="text-foreground/90">{t(`compare.${key}`)}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-semibold">{t("included")}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
