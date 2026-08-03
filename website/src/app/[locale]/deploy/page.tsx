import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { PageIntro } from "@/components/sections/section-header";
import { DeploySection } from "@/components/sections/deploy";
import { CtaSection } from "@/components/sections/cta";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "deploy" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function DeployPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "deploy" });

  return (
    <>
      <PageIntro title={t("title")} subtitle={t("subtitle")} />
      <DeploySection />
      <CtaSection locale={locale} />
    </>
  );
}
