import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  Newspaper,
  ListTodo,
  Map,
  Users,
  Activity,
  Info,
  Github,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageIntro } from "@/components/sections/section-header";
import type { Locale } from "@/i18n/config";

const ICONS: Record<string, LucideIcon> = {
  docs: BookOpen,
  blog: Newspaper,
  changelog: ListTodo,
  roadmap: Map,
  contributors: Users,
  status: Activity,
  about: Info,
};

export async function ResourcePage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const t = await getTranslations({ locale });
  const ns = `resources.${slug}`;
  const raw = t.raw(ns) as { title: string; subtitle: string; body: string };
  const Icon = ICONS[slug] ?? Info;

  return (
    <>
      <PageIntro title={raw.title} subtitle={raw.subtitle} />

      <section className="pb-20 sm:pb-28">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {slug === "status" && (
              <div className="mb-8 flex flex-wrap items-center gap-2">
                <Badge variant="success" className="gap-1.5 px-3 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  All systems operational
                </Badge>
              </div>
            )}

            <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur sm:p-10">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
                <Icon className="h-6 w-6" />
              </span>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85 sm:text-base">
                {raw.body}
              </p>

              <div className="mt-2 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button asChild variant="outline" size="lg">
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4" />
                    {t("nav.home")}
                  </Link>
                </Button>
                <Button asChild variant="gradient" size="lg">
                  <a
                    href="${GITHUB_REPO}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
