"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useLocale } from "./locale-provider";
import { LOCALES, type LocaleCode } from "@/lib/i18n-config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LocaleSwitcher() {
  const { locale, setLocale, config } = useLocale();
  const id = React.useId();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Language: ${config.nativeName}. Change language`}
          aria-haspopup="listbox"
          className="relative"
        >
          <Globe className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
          <span className="sr-only">
            Current language: {config.nativeName} ({config.name})
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none"
          >
            {config.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" role="listbox" aria-labelledby={`${id}-label`}>
        <DropdownMenuLabel id={`${id}-label`}>Language / Lingua</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(LOCALES).map((l) => {
          const selected = l.code === locale;
          return (
            <DropdownMenuItem
              key={l.code}
              role="option"
              aria-selected={selected}
              onSelect={() => setLocale(l.code as LocaleCode)}
              className="flex items-center gap-2"
            >
              <span aria-hidden="true" className="text-base leading-none">
                {l.flag}
              </span>
              <span className="flex-1">{l.nativeName}</span>
              <span className="text-xs text-muted-foreground">{l.name}</span>
              {selected && <span className="sr-only"> (selected)</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
