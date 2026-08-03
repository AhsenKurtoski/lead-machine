import { getTranslations } from "next-intl/server";
import { CalendarClock } from "lucide-react";
import type { Locale } from "@/i18n/config";

type LegalRaw = Record<
  string,
  string | { title: string; body: string } | { cols: string[]; rows: string[][] }
>;

function Paragraph({ children }: { children: string }) {
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85 sm:text-base">
      {children}
    </p>
  );
}

function Block({
  title,
  body,
}: {
  title?: string;
  body: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      {title && (
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      )}
      <Paragraph>{body}</Paragraph>
    </section>
  );
}

function Table({
  cols,
  rows,
}: {
  cols: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {cols.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 align-top text-muted-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function LegalPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const t = await getTranslations({ locale });
  const ns = `legal.${slug}`;
  const raw = t.raw(ns) as LegalRaw;

  const title = typeof raw.title === "string" ? raw.title : "";
  const subtitle = typeof raw.subtitle === "string" ? raw.subtitle : "";
  const lastUpdated = typeof raw.lastUpdated === "string" ? raw.lastUpdated : "";

  const content = Object.entries(raw).filter(
    ([key]) => key !== "title" && key !== "subtitle" && key !== "lastUpdated",
  );

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-20 pb-10 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/20" />
        </div>
        <div className="container">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base text-muted-foreground sm:text-lg">
                {subtitle}
              </p>
            )}
            {lastUpdated && (
              <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {t("legal.lastUpdated")}: {lastUpdated}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="container">
          <div className="mx-auto flex max-w-3xl flex-col gap-8">
            {content.map(([key, value]) => {
              if (typeof value === "string") {
                return <Block key={key} body={value} />;
              }
              if ("cols" in value && "rows" in value) {
                return <Table key={key} cols={value.cols} rows={value.rows} />;
              }
              return <Block key={key} title={value.title} body={value.body} />;
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
