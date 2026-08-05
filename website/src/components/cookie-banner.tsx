"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COOKIE_KEY = "lm_consent";

export function CookieBanner() {
  const t = useTranslations("cookieBanner");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(COOKIE_KEY);
      if (!v) setTimeout(() => setVisible(true), 1200);
    } catch {
      // noop
    }
  }, []);

  if (!visible) return null;

  function accept() {
    setVisible(false);
    try {
      localStorage.setItem(COOKIE_KEY, "accepted_" + Date.now());
      const d = new Date();
      d.setTime(d.getTime() + 90 * 24 * 60 * 60 * 1000);
      document.cookie = `${COOKIE_KEY}=1; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
    } catch {
      // noop
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-6",
        "animate-fade-in-up"
      )}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="mx-auto max-w-5xl">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border shadow-2xl",
            "bg-background/95 backdrop-blur-xl border-border/60",
            "glassmorphism"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4 p-5 sm:p-6">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Cookie className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-base mb-1">Cookies</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("text")}{" "}
                  <Link
                    href="/cookies"
                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4 whitespace-nowrap"
                  >
                    {t("more")}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 md:ml-2">
              <Button onClick={accept} variant="gradient" size="lg" className="w-full md:w-auto">
                {t("accept")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
