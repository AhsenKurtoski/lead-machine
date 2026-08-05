import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { LegalPage } from "@/components/legal-page";
import { ContactForm } from "@/components/contact-form";
import { ResourcePage } from "@/components/resource-page";
import { PageIntro } from "@/components/sections/section-header";

const LEGAL = ["privacy", "terms", "cookies", "imprint", "dpa", "security"];
const FORMS = ["demo-request", "partnership", "report-issue", "waitlist"];
const RESOURCES = [
  "docs",
  "blog",
  "changelog",
  "roadmap",
  "contributors",
  "status",
  "about",
];

export const dynamicParams = false;

export function generateStaticParams() {
  return [...LEGAL, ...FORMS, ...RESOURCES].map((page) => ({ page }));
}

function namespaceFor(page: string): string | null {
  if (LEGAL.includes(page)) return `legal.${page}`;
  if (FORMS.includes(page)) return `forms.${page}`;
  if (RESOURCES.includes(page)) return `resources.${page}`;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; page: string };
}): Promise<Metadata> {
  const ns = namespaceFor(params.page);
  if (!ns) return { title: "Not Found" };
  const t = await getTranslations({ locale: params.locale });
  const raw = t.raw(ns) as { title: string; subtitle?: string };
  return { title: raw.title, description: raw.subtitle };
}

export default async function DynamicPage({
  params,
}: {
  params: { locale: string; page: string };
}) {
  const locale = params.locale as Locale;
  const { page } = params;

  setRequestLocale(locale);

  if (LEGAL.includes(page)) {
    return <LegalPage locale={locale} slug={page} />;
  }

  if (FORMS.includes(page)) {
    const t = await getTranslations({ locale });
    const raw = t.raw(`forms.${page}`) as { title: string; subtitle: string };
    return (
      <>
        <PageIntro title={raw.title} subtitle={raw.subtitle} />
        <section className="pb-20 sm:pb-28">
          <div className="container">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur sm:p-10">
              <ContactForm slug={page} />
            </div>
          </div>
        </section>
      </>
    );
  }

  if (RESOURCES.includes(page)) {
    return <ResourcePage locale={locale} slug={page} />;
  }

  notFound();
}
