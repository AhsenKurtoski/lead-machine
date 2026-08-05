import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { PageIntro } from "@/components/sections/section-header";
import { TransparencySection } from "@/components/sections/transparency";
import { CtaSection } from "@/components/sections/cta";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "transparency",
  });
  return { title: t("title"), description: t("subtitle") };
}

export default async function TransparencyPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "transparency" });

  return (
    <>
      <PageIntro title={t("title")} subtitle={t("subtitle")} />
      <TransparencySection />
      <CtaSection locale={locale} />
    </>
  );
}
