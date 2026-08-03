"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { locales, localeLabels, type Locale } from "@/i18n/config";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const labels = localeLabels[locale] ?? localeLabels.en;

  function changeLocale(next: Locale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="rounded-full gap-1.5"
          aria-label={labels.native}
        >
          <Globe className="h-4 w-4" />
          {!compact && (
            <>
              <span className="text-base leading-none">{labels.flag}</span>
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {locale}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t?.("language") || "Language"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((code) => {
          const l = localeLabels[code];
          const selected = code === locale;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => changeLocale(code)}
              className={selected ? "bg-accent/60 font-semibold" : ""}
            >
              <span className="text-lg mr-2">{l.flag}</span>
              <span className="flex-1">{l.native}</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground opacity-70">
                {code}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
