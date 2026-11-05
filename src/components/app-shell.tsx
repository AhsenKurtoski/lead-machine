"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Users,
  Map,
  CalendarDays,
  MessageSquareText,
  MessageCircle,
  PhoneCall,
  Settings,
  ScrollText,
  BookOpen,
  Receipt,
  Menu,
  X,
  LogOut,
  BarChart3,
  Target,
  Rocket,
  Inbox,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useLocale } from "@/components/locale-provider";
import { Toaster } from "@/components/ui/toaster";
import { AUTHOR } from "@/lib/author";


type NavItem = { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };

const NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/ricerca", labelKey: "nav.search", icon: Search },
  { href: "/crm", labelKey: "nav.crm", icon: Users },
  { href: "/mappa", labelKey: "nav.map", icon: Map },
  { href: "/messaggi", labelKey: "nav.messages", icon: MessageSquareText },
  { href: "/email", labelKey: "nav.email", icon: Inbox },
  { href: "/whatsapp", labelKey: "nav.whatsapp", icon: MessageCircle },
  { href: "/cold-call", labelKey: "nav.coldCall", icon: PhoneCall },
  { href: "/calendario", labelKey: "nav.calendar", icon: CalendarDays },
  { href: "/report", labelKey: "nav.reports", icon: BarChart3 },
  { href: "/ricevuta", labelKey: "nav.receipts", icon: Receipt },
  { href: "/opportunita", labelKey: "nav.opportunities", icon: Target },
  { href: "/attivita", labelKey: "nav.activities", icon: ScrollText },
  { href: "/portfolio", labelKey: "nav.portfolio", icon: Rocket },
  { href: "/guida", labelKey: "nav.guide", icon: BookOpen },
  { href: "/health", labelKey: "nav.health", icon: ShieldCheck },
  { href: "/impostazioni", labelKey: "nav.settings", icon: Settings },
];

// Chiave e intervallo minimo dello sweep dei controlli rinviati: si prova una
// volta per sessione, non a ogni pagina.
const RETRY_SWEEP_KEY = "lead-machine-retry-sweep";
const RETRY_SWEEP_EVERY_MS = 10 * 60_000;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [searchRadiusM, setSearchRadiusM] = React.useState(5000);

  // Il raggio configurato e' nel database, non nel layout: una query nel root
  // layout renderebbe statico/dinamico l'intero albero e potrebbe rompere il
  // build in CI senza database. Lo leggiamo dal client una volta sola.
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const value = Number(data?.settings?.search_radius_m);
        if (!cancelled && Number.isFinite(value) && value > 0) setSearchRadiusM(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  // I controlli di verifica rinviati per un errore di rete si riprovano da soli:
  // all'apertura dell'app si chiede al server di processare la coda scaduta.
  // E' un lavoro di sottofondo: nessun errore puo' bloccare la pagina.
  React.useEffect(() => {
    try {
      const last = Number(window.sessionStorage.getItem(RETRY_SWEEP_KEY) || 0);
      if (Number.isFinite(last) && Date.now() - last < RETRY_SWEEP_EVERY_MS) return;
      window.sessionStorage.setItem(RETRY_SWEEP_KEY, String(Date.now()));
    } catch {
      // Senza sessionStorage (o con lo storage bloccato) si prova comunque.
    }
    void fetch("/api/leads/verify/retry", { method: "POST" }).catch(() => {});
  }, []);

  // Pagine "a tutta pagina" senza sidebar: sito demo, ricevuta stampabile, portfolio.
  if (
    pathname === "/login" ||
    pathname?.startsWith("/demo/") ||
    pathname?.startsWith("/ricevuta/") ||
    pathname?.startsWith("/portfolio")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside
        className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur"
        aria-label="Main navigation"
      >
        <SidebarContent pathname={pathname} searchRadiusM={searchRadiusM} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col border-r bg-card animate-fade-in"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <SidebarContent pathname={pathname} searchRadiusM={searchRadiusM} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Colonna principale */}
      <div className="flex flex-1 flex-col min-w-0">
        <header
          role="banner"
          className="sticky top-0 z-40 flex h-16 items-center gap-2 md:gap-4 border-b bg-background/80 px-3 md:px-6 backdrop-blur"
        >
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
          <div className="flex-1" aria-hidden="true" />
          <LocaleSwitcher />
          <NotificationsBell />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Esci"
            title="Esci"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in focus:outline-none"
        >
          {children}
        </main>
          <Toaster />

      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  searchRadiusM,
  onNavigate,
}: {
  pathname: string;
  searchRadiusM: number;
  onNavigate?: () => void;
}) {
  const { t, config } = useLocale();
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-4 md:px-6">
        <img src="/logo.png" alt="Lead Machine logo" className="h-9 w-9 rounded-lg object-contain" />
        <span className="text-lg font-bold tracking-tight">
          {t("app.title")}
        </span>
      </div>
      <nav
        id="mobile-nav"
        className="flex-1 space-y-1 p-2 md:p-3 overflow-y-auto"
        aria-label="Primary"
      >
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          {t("app.zone")}: {config.flag} {config.nativeName}
        </p>
        <p>
          {t("app.radius")} {Math.max(1, Math.round(searchRadiusM / 1000))} {config.distanceUnit} ·{" "}
          {t("app.free")}
        </p>
        {/* Il credito sta nella barra laterale, cioe' in ogni pagina: chi apre
            l'app vede subito chi l'ha creata. Il link e' il profilo pubblico
            dell'autore (lo stesso dei dati strutturati e delle keywords). */}
        <p className="pt-1">
          <a
            href={AUTHOR.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
          >
            {t("app.creator")}
          </a>
        </p>
      </div>
    </>
  );
}
