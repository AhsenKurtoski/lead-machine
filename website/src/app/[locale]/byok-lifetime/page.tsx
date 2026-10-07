import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { PageIntro } from "@/components/sections/section-header";
import { ByokTabs } from "@/components/sections/byok";
import { CtaSection } from "@/components/sections/cta";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "byok" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function ByokPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  const locale = params.locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "byok" });

  return (
    <>
      <PageIntro title={t("title")} subtitle={t("subtitle")} />
      <ByokTabs />
      <CtaSection locale={locale} />
    </>
  );
}
