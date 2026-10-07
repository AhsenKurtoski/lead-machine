import * as React from "react";
import { getSettings } from "@/lib/settings";
import { Globe, Rocket, Search, MessageCircle, Sparkles, CheckCircle2, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const s = await getSettings();
  const brand = s.brand_name || "Ahsen-Studio";
  const tagline = s.brand_tagline || "Siti web professionali per le attivita locali";
  const owner = s.brand_owner || "";
  const phone = s.brand_phone || "";
  const email = s.brand_email || s.formsubmit_email || "";
  const city = s.search_city || "Feltre";

  const services = [
    { icon: Globe, title: "Sito web premium", text: "Siti moderni, veloci e ottimizzati per mobile, su misura per la tua attivita." },
    { icon: Search, title: "Visibilita su Google", text: "Struttura SEO-friendly per farti trovare dai clienti della tua zona." },
    { icon: MessageCircle, title: "Contatti diretti", text: "Pulsanti WhatsApp, telefono e mappa per ricevere subito richieste." },
    { icon: Sparkles, title: "Design su misura", text: "Colori, foto e testi pensati per il tuo settore e i tuoi clienti." },
  ];

  const steps = [
    { n: "01", title: "Analisi gratuita", text: "Studiamo la tua attivita e cosa cercano i tuoi clienti." },
    { n: "02", title: "Anteprima del sito", text: "Ti mostriamo una bozza reale, senza impegno." },
    { n: "03", title: "Online in pochi giorni", text: "Pubblichiamo il sito e ti seguiamo nel tempo." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      {/* Hero */}
      <header className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Rocket className="h-7 w-7" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{brand}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{tagline}</p>
        <p className="mt-2 text-sm text-muted-foreground">Web agency per attivita locali a {city} e in provincia di Belluno</p>
        {phone ? (
          <a
            href={"https://wa.me/" + phone.replace(/[^0-9]/g, "")}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            <MessageCircle className="h-5 w-5" /> Richiedi una anteprima gratuita
          </a>
        ) : null}
      </header>

      {/* Servizi */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold">Cosa facciamo</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {services.map((sv) => (
            <div key={sv.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <sv.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{sv.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{sv.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Come funziona */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold">Come funziona</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {steps.map((st) => (
            <div key={st.n} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
              <p className="text-3xl font-bold text-primary">{st.n}</p>
              <h3 className="mt-2 font-semibold">{st.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{st.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perche noi */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Perche sceglierci</h2>
          <ul className="mt-4 space-y-3">
            {[
              "Anteprima del sito reale, gratis e senza impegno",
              "Prezzi chiari e adatti alle piccole attivita",
              "Tutto gestito da noi: testi, foto, pubblicazione",
              "Assistenza continua nel tempo",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contatti */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="text-2xl font-bold">Parliamone</h2>
        <p className="mt-2 text-muted-foreground">Contattaci per una consulenza gratuita.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {phone ? (
            <a href={"tel:" + phone.replace(/\s/g, "")} className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-accent">
              <Phone className="h-4 w-4" /> {phone}
            </a>
          ) : null}
          {email ? (
            <a href={"mailto:" + email} className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-accent">
              <Mail className="h-4 w-4" /> {email}
            </a>
          ) : null}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          {brand}{owner ? " - " + owner : ""} - {new Date().getFullYear()}
        </p>
      </section>
    </div>
  );
}
