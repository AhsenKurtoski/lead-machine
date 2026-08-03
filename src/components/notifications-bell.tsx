"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, UserPlus, Clock, MessageCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale-provider";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  link: string | null;
  createdAt: string;
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  nuovo_lead: UserPlus,
  follow_up: Clock,
  risposta: MessageCircle,
  sistema: Info,
};

function useTimeAgo() {
  const { locale, formatDate } = useLocale();
  return React.useCallback(
    (date: string) => {
      const diff = Date.now() - new Date(date).getTime();
      const min = Math.floor(diff / 60000);
      // Unit strings are minimal; fall back to numbers if no translation.
      const tMin = locale === "it" ? "min fa" : locale === "de" ? "Min." : locale === "fr" ? "min" : locale === "sl" ? "min nazaj" : locale === "es" ? "min" : locale === "pt" ? "min atrás" : "m ago";
      const tHour = locale === "it" ? "h fa" : locale === "de" ? "Std." : locale === "fr" ? "h" : locale === "sl" ? "ur nazaj" : locale === "es" ? "h" : locale === "pt" ? "h atrás" : "h ago";
      const tDay = locale === "it" ? "g fa" : locale === "de" ? "Tage" : locale === "fr" ? "j" : locale === "sl" ? "dni nazaj" : locale === "es" ? "d" : locale === "pt" ? "d atrás" : "d ago";
      const tNow = locale === "it" ? "ora" : locale === "de" ? "gerade eben" : locale === "fr" ? "à l'instant" : locale === "sl" ? "ravno" : locale === "es" ? "ahora" : locale === "pt" ? "agora" : "now";
      if (min < 1) return tNow;
      if (min < 60) return `${min} ${tMin}`;
      const h = Math.floor(min / 60);
      if (h < 24) return `${h} ${tHour}`;
      const d = Math.floor(h / 24);
      if (d < 7) return `${d} ${tDay}`;
      return formatDate(date);
    },
    [locale, formatDate]
  );
}

export function NotificationsBell() {
  const router = useRouter();
  const { t } = useLocale();
  const timeAgo = useTimeAgo();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const panelId = React.useId();
  const btnRef = React.useRef<HTMLButtonElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // silenzioso: la campanella non deve mai bloccare la UI
    }
  }

  React.useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Close on Escape and click outside (outside is already handled).
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function markAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  async function openItem(n: NotificationItem) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      fetch("/api/notifications/" + n.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const label = unread > 0 ? `${t("notifications.title")} — ${unread} ${t("notifications.unread")}` : t("notifications.title");

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 ? (
          <span
            role="status"
            aria-live="polite"
            className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            <span className="sr-only">{unread} {t("notifications.unread")}</span>
            <span aria-hidden="true">{unread > 9 ? "9+" : unread}</span>
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id={panelId}
            role="dialog"
            aria-label={t("notifications.title")}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg animate-fade-in"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">{t("notifications.title")}</span>
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> {t("notifications.markAllRead")}
                </button>
              ) : null}
            </div>
            <ul role="list" className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">{t("notifications.empty")}</li>
              ) : (
                items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Info;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        aria-label={`${n.title}${n.read ? "" : " (unread)"}`}
                        className={cn(
                          "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{n.title}</span>
                            {!n.read ? (
                              <span
                                role="img"
                                aria-label="Unread"
                                className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                              />
                            ) : null}
                          </span>
                          {n.message ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.message}</span>
                          ) : null}
                          <time
                            dateTime={new Date(n.createdAt).toISOString()}
                            className="mt-0.5 block text-[11px] text-muted-foreground"
                          >
                            {timeAgo(n.createdAt)}
                          </time>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
