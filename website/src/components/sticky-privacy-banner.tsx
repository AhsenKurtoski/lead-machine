"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function StickyPrivacyBanner() {
  const t = useTranslations("byokBanner");
  const [closed, setClosed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      const v = localStorage.getItem("lm_banner_closed");
      if (v === "1") setClosed(true);
    } catch {
      // noop
    }
  }, []);

  if (closed || !mounted) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-[60] w-full border-b backdrop-blur-md transition-all duration-300",
        "bg-gradient-to-r from-indigo-600/10 via-violet-500/10 to-fuchsia-500/10",
        "border-indigo-500/20 dark:border-indigo-400/20"
      )}
      role="region"
      aria-label="Privacy & BYOK banner"
    >
      <div className="container flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <p className="leading-tight">
            <strong>{t("title")}</strong>{" "}
            <span className="text-muted-foreground">{t("subtitle")}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/byok-lifetime"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4"
          >
            {t("cta")}
          </Link>
          <button
            onClick={() => {
              setClosed(true);
              try {
                localStorage.setItem("lm_banner_closed", "1");
              } catch {
                // noop
              }
            }}
            className="rounded-md p-1 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-accent/50 transition"
            aria-label="Close privacy banner"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
