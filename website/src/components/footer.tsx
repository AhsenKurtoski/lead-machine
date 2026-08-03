import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Zap, Github, Twitter, Linkedin, Mail, Heart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { GITHUB_REPO } from "@/lib/site";
import { cn } from "@/lib/utils";

const LEGAL_KEYS = [
  "privacy",
  "terms",
  "cookies",
  "imprint",
  "dpa",
  "security",
] as const;

const PRODUCT_KEYS = [
  "features",
  "pricing",
  "byok",
  "transparency",
  "deploy",
  "docs",
] as const;

const PRODUCT_EXTRA: Array<[string, string]> = [
  ["demo", "nav.liveDemo"],
] as any;

const RESOURCE_KEYS = [
  "blog",
  "changelog",
  "roadmap",
  "contributors",
  "status",
  "about",
] as const;

const FORM_KEYS: Array<[string, string]> = [
  ["demo-request", "nav.demo"],
  ["partnership", "nav.partnership"],
  ["report-issue", "Bug report"],
  ["waitlist", "Waitlist"],
] as any;

export function Footer() {
  const t = useTranslations();
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t bg-muted/30">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <div className="container py-16">
        <div className="grid gap-10 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
                <Zap className="h-5 w-5 fill-current" />
              </span>
              <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500">
                Lead Machine
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
              {t("meta.description")}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="${GITHUB_REPO}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/leadmachine_dev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com/company/leadmachine"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@leadmachine.dev"
                aria-label="Email"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {(locales as readonly string[]).map((code) => {
                const l = localeLabels[code as keyof typeof localeLabels];
                const active = code === locale;
                return (
                  <Link
                    key={code}
                    href="/"
                    locale={code as Locale}
                    className={cn(
                      "text-xs rounded-md px-2 py-1 border transition font-medium",
                      active
                        ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    <span className="mr-1">{l.flag}</span>
                    {code.toUpperCase()}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-tight">{t("nav.features")?.slice(0, 1).toUpperCase() + "roduct" || "Product"}</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {PRODUCT_KEYS.map((k) => (
                <li key={k}>
                  <Link
                    href={`/${k === "byok" ? "byok-lifetime" : k}`}
                    className="text-muted-foreground hover:text-foreground link-underline"
                  >
                    {t(`nav.${k}`)}
                  </Link>
                </li>
              ))}
              {PRODUCT_EXTRA.map(([href, k]) => (
                <li key={href}>
                  <Link
                    href={`/${href}`}
                    className="text-muted-foreground hover:text-foreground link-underline"
                  >
                    {typeof k === "string" && k.startsWith("nav.") ? t(k) : k}
                  </Link>
                </li>
              ))}
              {FORM_KEYS.map(([href, k]) => (
                <li key={href}>
                  <Link
                    href={`/${href}`}
                    className="text-muted-foreground hover:text-foreground link-underline"
                  >
                    {typeof k === "string" && k.startsWith("nav.") ? t(k) : k}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-tight">Resources</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {RESOURCE_KEYS.map((k) => (
                <li key={k}>
                  <Link
                    href={`/${k}`}
                    className="text-muted-foreground hover:text-foreground link-underline"
                  >
                    {t(`nav.${k}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-tight">Legal</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {LEGAL_KEYS.map((k) => (
                <li key={k}>
                  <Link
                    href={`/${k}`}
                    className="text-muted-foreground hover:text-foreground link-underline"
                  >
                    {t(`nav.legal.${k}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            Â© {year} Lead Machine Contributors.{" "}
            {t("meta.license") || "Released under MIT License."}
            <span className="inline-flex items-center gap-1">
              Made with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> &nbsp;for freelancers worldwide.
            </span>
          </p>
          <p>
            OpenStreetMapÂ®, OpenStreetMap Foundation. Leaflet Â© Volodymyr Agafonkin. Next.js Â© Vercel.
          </p>
        </div>
      </div>
    </footer>
  );
}
