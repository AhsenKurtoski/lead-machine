import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { DemoApp, type DemoDict } from "@/components/demo/demo-app";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale });
  const demo = t.raw("demo") as Pick<DemoDict, "title" | "subtitle">;
  return {
    title: demo.title,
    description: demo.subtitle,
  };
}

export default async function DemoPage(props: Props) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale });
  const dict = t.raw("demo") as DemoDict;
  return <DemoApp dict={dict} />;
}
