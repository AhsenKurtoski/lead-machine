"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const id = React.useId();

  if (!mounted) return <div className="h-9 w-9" aria-hidden="true" />;

  const current = theme || "system";
  const CurrentIcon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;

  const actionLabels: Record<string, Record<string, string>> = {
    it: { light: "Chiaro", dark: "Scuro", system: "Sistema", change: "Tema" },
    de: { light: "Hell", dark: "Dunkel", system: "System", change: "Design" },
    fr: { light: "Clair", dark: "Sombre", system: "Système", change: "Thème" },
    sl: { light: "Svetlo", dark: "Temno", system: "Sistem", change: "Tema" },
    en: { light: "Light", dark: "Dark", system: "System", change: "Theme" },
    es: { light: "Claro", dark: "Oscuro", system: "Sistema", change: "Tema" },
    pt: { light: "Claro", dark: "Escuro", system: "Sistema", change: "Tema" },
  };

  // Detect locale from <html lang> (simple, no heavy dep)
  let lang = "en";
  try {
    const htmlLang = (document.documentElement.getAttribute("lang") || "en").toLowerCase().slice(0, 2);
    if (actionLabels[htmlLang]) lang = htmlLang;
  } catch {}

  const L = actionLabels[lang];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${L.change} — ${L[current as keyof typeof L] || current}. Change theme`}
          aria-haspopup="listbox"
          aria-controls={`${id}-list`}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
          {current === "system" && (
            <Monitor className="h-5 w-5 absolute opacity-0 transition-opacity dark:hidden data-[system=true]:opacity-100" aria-hidden="true" />
          )}
          <span className="sr-only">
            Current theme: {L[current as keyof typeof L] || current}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" role="listbox" aria-labelledby={`${id}-label`}>
        <DropdownMenuLabel id={`${id}-label`}>{L.change}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => {
          const selected = current === t.value;
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              role="option"
              aria-selected={selected}
              onSelect={() => setTheme(t.value)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{L[t.value]}</span>
              {selected && <span className="sr-only"> (selected)</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
