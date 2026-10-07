import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale, getTranslations } from "next-intl/server";
import { locales, localeLabels, isValidLocale, type Locale } from "@/i18n/config";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { StickyPrivacyBanner } from "@/components/sticky-privacy-banner";
import { CookieBanner } from "@/components/cookie-banner";
import { Toaster } from "@/components/ui/toaster";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  if (!isValidLocale(params.locale)) notFound();
  const l = params.locale as Locale;
  const label = localeLabels[l];
  const t = await getTranslations({ locale: l, namespace: "meta" });

  const altLangs: Record<string, string> = {};
  for (const code of locales) {
    altLangs[label.bcp47] = `/${code}`;
  }

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    alternates: {
      canonical: `/${l}`,
      languages: altLangs,
    },
    openGraph: {
      locale: label.bcp47,
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: ["/og-image.png"],
    },
    twitter: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: ["/og-image.png"],
    },
  };
}

export default async function LocaleLayout(props: Props) {
  const params = await props.params;

  const {
    children
  } = props;

  if (!isValidLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Toaster>
        <div className="relative flex min-h-screen flex-col overflow-x-clip">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 hero-gradient-bg opacity-60" />
            <div className="absolute inset-0 grid-pattern-bg" />
            <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/20" />
            <div className="absolute top-80 right-0 h-[400px] w-[400px] rounded-full bg-fuchsia-500/10 blur-[120px] dark:bg-fuchsia-500/15" />
            <div className="absolute top-[600px] left-0 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-500/15" />
          </div>
          <StickyPrivacyBanner />
          <Navbar />
          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            className="flex-1"
          >
            {children}
          </main>
          <Footer />
          <CookieBanner />
        </div>
      </Toaster>
    </NextIntlClientProvider>
  );
}
