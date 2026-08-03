import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Sparkles, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";
import type { Locale } from "@/i18n/config";

export async function Showcase({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "showcase" });

  return (
    <section id="showcase" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-0 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/15" />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        </Reveal>

        <div className="mx-auto mt-12 max-w-5xl sm:mt-16">
          <Reveal delay={100}>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />
              <div className="mockup-frame">
                <img
                  src="/product-screenshots/screenshot-demo.png"
                  alt="Lead Machine live demo with real OpenStreetMap search results"
                  className="w-full rounded-lg"
                  width={1440}
                  height={900}
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="gradient" size="xl" className="w-full sm:w-auto">
                <Link href="/demo">
                  <MonitorPlay className="h-5 w-5" />
                  {t("cta")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Badge variant="gradient" className="gap-1.5 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("credits")}
              </Badge>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
