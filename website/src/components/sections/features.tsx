"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  MapPin,
  Users,
  FileText,
  Sparkles,
  ShieldCheck,
  Map,
  CopyCheck,
  Link2,
  MapPinned,
  Gauge,
  History,
  Mail,
  MessageCircle,
  Bell,
  ListChecks,
  FileDown,
  Workflow,
  FileJson,
  RefreshCcw,
  PenLine,
  KeyRound,
  Database,
  EyeOff,
  Code2,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";
import { cn } from "@/lib/utils";

const CATEGORIES: Array<{
  key: string;
  icon: LucideIcon;
  label: string;
  items: Array<{ key: string; icon: LucideIcon }>;
}> = [
  {
    key: "research",
    icon: MapPin,
    label: "categories.research",
    items: [
      { key: "geo", icon: Map },
      { key: "dedup", icon: CopyCheck },
      { key: "crawler", icon: Link2 },
      { key: "map", icon: MapPinned },
    ],
  },
  {
    key: "crm",
    icon: Users,
    label: "categories.crm",
    items: [
      { key: "scoring", icon: Gauge },
      { key: "timeline", icon: History },
      { key: "email", icon: Mail },
      { key: "whatsapp", icon: MessageCircle },
      { key: "followups", icon: Bell },
    ],
  },
  {
    key: "quotes",
    icon: FileText,
    label: "categories.quotes",
    items: [
      { key: "lineitems", icon: ListChecks },
      { key: "pdf", icon: FileDown },
      { key: "workflow", icon: Workflow },
      { key: "csv", icon: FileJson },
    ],
  },
  {
    key: "ai",
    icon: Sparkles,
    label: "categories.ai",
    items: [
      { key: "failover", icon: RefreshCcw },
      { key: "scripts", icon: PenLine },
      { key: "byok", icon: KeyRound },
    ],
  },
  {
    key: "privacy",
    icon: ShieldCheck,
    label: "categories.privacy",
    items: [
      { key: "local", icon: Database },
      { key: "zero", icon: EyeOff },
      { key: "opensource", icon: Code2 },
    ],
  },
];

export function FeaturesTabs() {
  const t = useTranslations("features");

  return (
    <section id="features" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-0 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-500/15" />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeader
            eyebrow={t("categories.research").split(" ")[0]}
            title={t("title")}
            subtitle={t("subtitle")}
          />
        </Reveal>

        <Reveal delay={150} className="mt-10 sm:mt-14">
          <Tabs defaultValue="research" className="w-full">
            <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-2xl bg-muted/60 p-1.5 sm:w-auto">
              {CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:via-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white"
                >
                  <cat.icon className="h-4 w-4" />
                  {t(cat.label)}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map((cat) => (
              <TabsContent key={cat.key} value={cat.key}>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.items.map((item) => (
                    <div
                      key={item.key}
                      className="card-hover group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6"
                    >
                      <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl transition-opacity opacity-0 group-hover:opacity-100" />
                      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 text-base font-semibold tracking-tight">
                        {t(`${cat.key}.${item.key}_title`)}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {t(`${cat.key}.${item.key}_desc`)}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>
      </div>
    </section>
  );
}
