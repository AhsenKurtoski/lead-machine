import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { Hero } from "@/components/sections/hero";
import { FeaturesTabs } from "@/components/sections/features";
import { Showcase } from "@/components/sections/showcase";
import { ByokTabs } from "@/components/sections/byok";
import { TransparencySection } from "@/components/sections/transparency";
import { DeploySection } from "@/components/sections/deploy";
import { Faq } from "@/components/sections/faq";
import { CtaSection } from "@/components/sections/cta";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
    twitter: {
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

export default async function HomePage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  const locale = params.locale as Locale;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <FeaturesTabs />
      <Showcase locale={locale} />
      <ByokTabs />
      <TransparencySection />
      <DeploySection />
      <Faq />
      <CtaSection locale={locale} />
    </>
  );
}
