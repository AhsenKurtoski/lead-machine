"use client";

import * as React from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Menu, Zap, Github, Star, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { GITHUB_REPO } from "@/lib/site";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = { key: string; href: string; primary?: boolean; external?: boolean };

const PRIMARY: NavItem[] = [
  { key: "nav.features", href: "/features" },
  { key: "nav.byok", href: "/byok-lifetime" },
  { key: "nav.transparency", href: "/transparency" },
  { key: "nav.deploy", href: "/deploy" },
  { key: "nav.docs", href: "/docs" },
];

const RESOURCES: NavItem[] = [
  { key: "nav.blog", href: "/blog" },
  { key: "nav.changelog", href: "/changelog" },
  { key: "nav.roadmap", href: "/roadmap" },
  { key: "nav.contributors", href: "/contributors" },
  { key: "nav.status", href: "/status" },
  { key: "nav.about", href: "/about" },
];

const LEGAL_KEYS = [
  "privacy",
  "terms",
  "cookies",
  "imprint",
  "dpa",
  "security",
] as const;

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header
      className={cn(
        "sticky z-50 top-0 transition-all duration-300 w-full",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-border/40" />
      <div
        className="absolute top-0 left-0 h-px bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="Lead Machine Home">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all duration-300 group-hover:-translate-y-0.5">
            <Zap className="h-5 w-5 fill-current" />
          </span>
          <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500">
            Lead Machine
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {PRIMARY.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive(it.href)
                  ? "text-foreground bg-accent/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              {t(it.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("nav.starOnGithub")}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent/50 transition"
          >
            <Github className="h-4 w-4" />
            <span className="hidden md:inline">GitHub</span>
            <Star className="h-3.5 w-3.5 fill-current text-indigo-600 dark:text-indigo-400" />
          </a>
          <LocaleSwitcher compact />
          <ThemeToggle />
          <Button asChild variant="glass" size="sm" className="hidden md:inline-flex">
            <Link href="/demo">
              <Sparkles className="h-4 w-4 text-fuchsia-500" />
              {t("nav.liveDemo")}
            </Link>
          </Button>
          <Button asChild variant="gradient" size="sm" className="hidden md:inline-flex">
            <Link href="/deploy">
              {t("nav.getStarted")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 font-bold">
                    Lead Machine
                  </span>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-1 text-base">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-3">
                  Product
                </p>
                {PRIMARY.map((it) => (
                  <Link
                    key={it.key}
                    href={it.href}
                    className="px-3 py-2.5 rounded-md hover:bg-accent/50 font-medium"
                  >
                    {t(it.key)}
                  </Link>
                ))}
                <Separator className="my-2" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-2">
                  Resources
                </p>
                {RESOURCES.map((it) => (
                  <Link
                    key={it.key}
                    href={it.href}
                    className="px-3 py-2.5 rounded-md hover:bg-accent/50"
                  >
                    {t(it.key)}
                  </Link>
                ))}
                <Separator className="my-2" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-2">
                  Legal
                </p>
                {LEGAL_KEYS.map((k) => (
                  <Link
                    key={k}
                    href={`/${k}`}
                    className="px-3 py-2 rounded-md text-sm hover:bg-accent/50 text-muted-foreground"
                  >
                    {t(`nav.legal.${k}`)}
                  </Link>
                ))}
                <Separator className="my-3" />
                <Button asChild variant="glass" size="lg" className="mt-1">
                  <Link href="/demo">
                    <Sparkles className="h-4 w-4 text-fuchsia-500" />
                    {t("nav.liveDemo")}
                  </Link>
                </Button>
                <Button asChild variant="gradient" size="lg" className="mt-1">
                  <Link href="/deploy">
                    {t("nav.getStarted")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
