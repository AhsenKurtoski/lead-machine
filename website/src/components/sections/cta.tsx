import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Github, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GITHUB_REPO } from "@/lib/site";
import { Reveal } from "@/components/sections/reveal";
import type { Locale } from "@/i18n/config";

export async function CtaSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "cta" });

  return (
    <section className="relative py-20 sm:py-24">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 grid-pattern-bg opacity-20" />

            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-xl backdrop-blur">
                <Zap className="h-7 w-7 fill-current" />
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-balance text-white sm:text-5xl">
                {t("title")}
              </h2>
              <p className="text-base leading-relaxed text-white/80 sm:text-lg">
                {t("subtitle")}
              </p>
              <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="xl"
                  className="w-full bg-white text-indigo-700 shadow-xl hover:bg-white/90 sm:w-auto"
                >
                  <Link href="/deploy">
                    {t("primary")}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  <Link href="/demo">
                    <Sparkles className="h-5 w-5" />
                    {t("demo")}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  <a
                    href="${GITHUB_REPO}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-5 w-5" />
                    {t("secondary")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
