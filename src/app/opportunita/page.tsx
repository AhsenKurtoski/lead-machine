import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildOpportunities,
  filterOpportunities,
  opportunityStats,
  opportunityStatusLabel,
} from "@/lib/opportunities";
import { Globe, Phone, Mail, MessageCircle, ExternalLink, Sparkles, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunita senza sito",
  description:
    "Le attivita della tua zona che non hanno un sito web, ordinate per quanto hanno bisogno di te.",
  alternates: { canonical: "/opportunita" },
};

function waLink(number: string | null | undefined, text: string): string | null {
  const digits = (number ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
}

function telLink(number: string | null | undefined): string | null {
  const clean = (number ?? "").trim();
  return clean ? "tel:" + clean.replace(/\s+/g, "") : null;
}

// Quante attivita' disegnare per pagina. La coda puo' arrivare a centinaia di
// righe: senza paginazione la pagina scarica oltre un MB di HTML e lo
// scorrimento diventa scattoso. Filtri e statistiche restano sull'intero elenco.
// 25 tiene il primo schermo ben sotto il budget di `npm run perf:check`
// (misurato: ~300 KB con 25 card, ~580 KB con 50).
const PAGE_SIZE = 25;

function pageHref(
  sp: { search?: string; city?: string; only?: string },
  page: number
): string {
  const params = new URLSearchParams();
  if (sp.search) params.set("search", sp.search);
  if (sp.city) params.set("city", sp.city);
  if (sp.only) params.set("only", sp.only);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return "/opportunita" + (qs ? "?" + qs : "");
}

export default async function OpportunitaPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; city?: string; only?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const only = sp.only ?? "";
  const requestedPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  let items: ReturnType<typeof buildOpportunities> = [];
  let dbError = false;

  try {
    const leads = await prisma.lead.findMany({
      where: { status: { not: "SCARTATO" } },
      orderBy: [{ priorityScore: "desc" }, { name: "asc" }],
      take: 500,
      select: {
        id: true,
        name: true,
        category: true,
        subcategory: true,
        city: true,
        hasWebsite: true,
        website: true,
        websiteStatus: true,
        hasSocial: true,
        phone: true,
        whatsapp: true,
        email: true,
        googleRating: true,
        googleReviews: true,
        status: true,
      },
    });
    items = buildOpportunities(leads);
  } catch {
    dbError = true;
  }

  const visible = filterOpportunities(items, {
    search: sp.search,
    city: sp.city,
    onlyWithoutWebsite: only === "nosite",
    onlyContactable: only === "contactable",
  });

  const stats = opportunityStats(items);

  // Paginazione lato server: si disegna una pagina alla volta, con i link che
  // mantengono i filtri attivi.
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Opportunita senza sito</h1>
        <p className="text-muted-foreground">
          Le attivita della tua zona che <strong>non hanno un sito web</strong>, ordinate per quanto
          hanno bisogno di te. In cima trovi quelle che puoi contattare subito.
        </p>
      </div>

      {dbError ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Database non raggiungibile. Avvia l&apos;app con{" "}
            <code>npm run setup</code>.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Attivita in archivio</p>
                <p className="mt-1 text-3xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/40">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Senza sito web</p>
                <p className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                  {stats.withoutWebsite}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Contattabili subito</p>
                <p className="mt-1 text-3xl font-bold">{stats.contactableWithoutWebsite}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtri</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Form GET: i filtri restano nell'URL, condivisibile e ricaricabile. */}
              <form className="grid gap-3 sm:grid-cols-4" method="get">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Cerca per nome</span>
                  <input
                    name="search"
                    defaultValue={sp.search ?? ""}
                    placeholder="es. pizzeria"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Citta</span>
                  <input
                    name="city"
                    defaultValue={sp.city ?? ""}
                    placeholder="es. Milano"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Mostra</span>
                  <select
                    name="only"
                    defaultValue={only}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Tutte le attivita</option>
                    <option value="nosite">Solo senza sito web</option>
                    <option value="contactable">Solo contattabili subito</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <Button type="submit" variant="outline" className="w-full">
                    Applica filtri
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {pageItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nessuna attivita da mostrare con questi filtri.{" "}
                <Link href="/ricerca" className="underline">
                  Cerca nuove attivita
                </Link>{" "}
                nella tua zona.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pageItems.map((it) => {
                const l = it.lead;
                const wa = waLink(
                  l.whatsapp || l.phone,
                  "Salve, sono " + (l.name ? "un consulente web" : "un consulente web") + ". Ho preparato un'anteprima gratuita del sito di " + l.name + ". Ve la mostro?"
                );
                const tel = telLink(l.phone);
                const mailto = l.email
                  ? "mailto:" + l.email + "?subject=" + encodeURIComponent("Un'anteprima di sito web per " + l.name)
                  : null;

                return (
                  <Card key={l.id}>
                    <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold truncate">{l.name}</span>
                          {it.withoutWebsite ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" variant="outline">
                              <Globe className="mr-1 h-3 w-3" /> Senza sito
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Ha un sito
                            </Badge>
                          )}
                          <Badge variant="outline">{opportunityStatusLabel(l.status)}</Badge>
                          <span className={cn("ml-1 text-sm font-bold tabular-nums", it.score >= 80 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                            {it.score}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[l.category, l.city].filter(Boolean).join(" - ")}
                          {it.reason ? " · " + it.reason : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {wa ? (
                          <a href={wa} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">
                              <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                            </Button>
                          </a>
                        ) : null}
                        {mailto ? (
                          <a href={mailto}>
                            <Button size="sm" variant="outline">
                              <Mail className="mr-1 h-4 w-4" /> Email
                            </Button>
                          </a>
                        ) : null}
                        {tel ? (
                          <a href={tel}>
                            <Button size="sm" variant="outline">
                              <Phone className="mr-1 h-4 w-4" /> Chiama
                            </Button>
                          </a>
                        ) : null}
                        <Link href={"/demo/" + l.id}>
                          <Button size="sm" variant="outline">
                            <Sparkles className="mr-1 h-4 w-4" /> Anteprima sito
                          </Button>
                        </Link>
                        <Link href={"/crm/" + l.id}>
                          <Button size="sm">
                            <ExternalLink className="mr-1 h-4 w-4" /> Scheda
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                Mostrate {pageItems.length} di {visible.length} attivita (pagina {currentPage} di{" "}
                {totalPages}).
              </p>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Link href={pageHref(sp, currentPage - 1)}>
                    <Button size="sm" variant="outline">
                      Precedente
                    </Button>
                  </Link>
                ) : null}
                {currentPage < totalPages ? (
                  <Link href={pageHref(sp, currentPage + 1)}>
                    <Button size="sm" variant="outline">
                      Successiva
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
