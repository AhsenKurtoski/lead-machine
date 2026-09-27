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
  FileText,
  Settings,
  ScrollText,
  BookOpen,
  Receipt,
  Calculator,
  Tag,
  Menu,
  X,
  BarChart3,
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
  { href: "/preventivi", labelKey: "nav.quotes", icon: FileText },
  { href: "/listino", labelKey: "nav.pricelist", icon: Tag },
  { href: "/ricevuta", labelKey: "nav.receipts", icon: Receipt },
  { href: "/fisco", labelKey: "nav.fiscal", icon: Calculator },
  { href: "/attivita", labelKey: "nav.activities", icon: ScrollText },
  { href: "/portfolio", labelKey: "nav.portfolio", icon: Rocket },
  { href: "/guida", labelKey: "nav.guide", icon: BookOpen },
  { href: "/impostazioni", labelKey: "nav.settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Pagine "a tutta pagina" senza sidebar: sito demo e preventivo stampabile.
  if (
    pathname?.startsWith("/demo/") ||
    pathname?.startsWith("/preventivo/") ||
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
        <SidebarContent pathname={pathname} />
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
            <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
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
  onNavigate,
}: {
  pathname: string;
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
          {t("app.radius")} 5 {config.distanceUnit} · {t("app.free")}
        </p>
      </div>
    </>
  );
}
