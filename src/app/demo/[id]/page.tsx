import * as React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDemoTheme } from "@/lib/demo-site";
import { getSettings } from "@/lib/settings";
import { aiConfigured } from "@/lib/ai";
import { generateDemoHtml } from "@/lib/demo-generate";

export const dynamic = "force-dynamic";

export default async function DemoPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) notFound();

  // Se esiste un sito generato dall'AI, lo mostriamo a tutta pagina,
  // isolato in un iframe (il suo CSS non interferisce con l'app).
  if (lead.demoHtml) {
    return (
      <iframe
        srcDoc={lead.demoHtml}
        title={"Sito demo - " + lead.name}
        className="h-screen w-full border-0"
      />
    );
  }

  const settings = await getSettings();

  // Nessun sito AI ancora salvato: se c'e una chiave AI configurata, generane
  // uno UNICO e su misura al volo, poi salvalo. Cosi ogni attivita ha il suo
  // sito professionale premium e non escono mai "sempre gli stessi siti".
  if (!lead.demoHtml && (await aiConfigured())) {
    try {
      const gen = await generateDemoHtml(
        lead,
        settings.brand_name || "La tua Web Agency",
        settings.brand_owner || "",
        settings.formsubmit_email || settings.brand_email || lead.email || "",
        lead.demoPrompt || "",
      );
      if (gen) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { demoHtml: gen.html, demoHtmlAt: new Date() },
        });
        return (
          <iframe
            srcDoc={gen.html}
            title={"Sito demo - " + lead.name}
            className="h-screen w-full border-0"
          />
        );
      }
    } catch {
      // AI non disponibile: mostriamo comunque il template premium qui sotto.
    }
  }

  const theme = getDemoTheme(lead.category, lead.id);
  const p = theme.palette;

  const phone = lead.mobile || lead.phone || "";
  const wa = lead.whatsapp ? "https://wa.me/" + lead.whatsapp : "";
  const brandName = settings.brand_name || "La tua Web Agency";
  const bookingEmail = settings.formsubmit_email || settings.brand_email || lead.email || "";
  const formAction = bookingEmail ? "https://formsubmit.co/" + bookingEmail : "";
  const year = new Date().getFullYear();
  const subtitle =
    (lead.subcategory ?? lead.category ?? "") + (lead.city ? " · " + lead.city : "");
  const headingFont = theme.font === "serif" ? "font-serif" : "";

  // Galleria: foto sempre disponibili (Lorem Picsum, gratis, nessuna chiave).
  const galleryImgs = Array.from({ length: 6 }, (_, i) =>
    "https://picsum.photos/seed/" + encodeURIComponent(lead.id + "-" + i) + "/640/420"
  );
  // Mappa Google integrata senza API key (output=embed).
  const mapQuery = encodeURIComponent(
    ((lead.addressFull ? lead.addressFull + " " : "") + (lead.city ?? "Feltre")) || lead.name
  );
  const mapSrc = "https://www.google.com/maps?q=" + mapQuery + "&output=embed";
  const hoursRows: Array<{ d: string; h: string }> = [
    { d: "Lunedì - Venerdì", h: "09:00 - 19:00" },
    { d: "Sabato", h: "09:00 - 13:00" },
    { d: "Domenica", h: "Su appuntamento" },
  ];
  const smoothStyle = {
    __html:
      "html{scroll-behavior:smooth}" +
      "@keyframes floatY{0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}" +
      "@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}" +
      "@keyframes shine{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}" +
      ".animate-fade-up{animation:fadeUp .8s cubic-bezier(.16,.84,.44,1) both}" +
      ".animate-fade-up-2{animation:fadeUp .8s cubic-bezier(.16,.84,.44,1) .15s both}" +
      ".hero-anim{background-size:200% 200%;animation:shine 14s ease infinite}" +
      ".card-hover{transition:transform .25s ease,box-shadow .25s ease}" +
      ".card-hover:hover{transform:translateY(-6px);box-shadow:0 18px 40px -12px rgba(0,0,0,.18)}" +
      ".float-btn{animation:floatY 3s ease-in-out infinite}",
  };
  // Dati strutturati LocalBusiness (SEO): aiutano Google a capire l'attività.
  const ldData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: lead.name,
    image: galleryImgs[0],
    telephone: phone || undefined,
    email: lead.email || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: lead.addressFull || undefined,
      addressLocality: lead.city || "Feltre",
      addressCountry: "IT",
    },
  };
  const jsonLd = { __html: JSON.stringify(ldData) };

  // Stili dinamici: i colori variabili passano da style (niente classi Tailwind).
  const heroBg: React.CSSProperties = {
    backgroundImage: "linear-gradient(135deg, " + p.primary + ", " + p.secondary + ")",
  };
  const primaryBg: React.CSSProperties = { backgroundColor: p.primary };
  const primaryText: React.CSSProperties = { color: p.primary };
  const darkBg: React.CSSProperties = { backgroundColor: p.dark };
  const softBg: React.CSSProperties = { backgroundColor: p.primary + "0f" };
  const softBorder: React.CSSProperties = { borderColor: p.primary + "33" };
  const chip: React.CSSProperties = { backgroundColor: p.primary + "1a", color: p.primary };
  const tileA: React.CSSProperties = {
    backgroundImage: "linear-gradient(135deg, " + p.primary + ", " + p.secondary + ")",
  };
  const tileB: React.CSSProperties = {
    backgroundImage: "linear-gradient(135deg, " + p.secondary + ", " + p.primary + ")",
  };

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <style dangerouslySetInnerHTML={smoothStyle} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />
      {/* Banner anteprima (nascosto in stampa) */}
      <div className="no-print w-full px-4 py-2 text-center text-xs font-medium text-white" style={primaryBg}>
        Anteprima sito realizzata per {lead.name} — proposta di {brandName}
      </div>

      {/* Header / nav */}
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className={"text-lg font-bold " + headingFont} style={primaryText}>
            {theme.emoji} {lead.name}
          </div>
          <nav className="hidden gap-6 text-sm font-medium text-zinc-600 md:flex">
            {theme.navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-zinc-900">
                {l.label}
              </a>
            ))}
          </nav>
          {phone ? (
            <a href={"tel:" + phone} className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={primaryBg}>
              {theme.ctaLabel}
            </a>
          ) : null}
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="hero-anim relative overflow-hidden text-white" style={heroBg}>
        <div className="mx-auto max-w-6xl px-6 py-28 text-center">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider">
            {subtitle}
          </span>
          <h1 className={"animate-fade-up mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight drop-shadow-sm sm:text-6xl " + headingFont}>
            {lead.name}
          </h1>
          <p className="animate-fade-up-2 mx-auto mt-5 max-w-2xl text-lg text-white/90">{theme.tagline}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">{theme.heroSubtitle}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {phone ? (
              <a href={"tel:" + phone} className="rounded-full bg-white px-7 py-3 font-semibold shadow-lg" style={primaryText}>
                Chiama ora
              </a>
            ) : null}
            {wa ? (
              <a href={wa} className="rounded-full border border-white/60 px-7 py-3 font-semibold text-white">
                Scrivici su WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* Statistiche */}
      <section className="border-b border-zinc-100">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-4 px-6 py-10 text-center">
          {theme.stats.map((s, i) => (
            <div key={i}>
              <div className={"text-2xl font-bold sm:text-3xl " + headingFont} style={primaryText}>
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Servizi */}
      <section id="servizi" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={chip}>
            I nostri servizi
          </span>
          <h2 className={"mt-4 text-3xl font-bold " + headingFont}>Cosa offriamo</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {theme.services.map((s, i) => (
            <div key={i} className="card-hover rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl" style={softBg}>
                {s.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Galleria fotografica */}
      <section className="mx-auto max-w-6xl px-6 pb-2 pt-2">
        <div className="text-center">
          <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={chip}>
            Galleria
          </span>
          <h2 className={"mt-4 text-3xl font-bold " + headingFont}>Uno sguardo da vicino</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {galleryImgs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={lead.name + " - foto " + (i + 1)}
              loading="lazy"
              className="h-52 w-full rounded-2xl object-cover shadow-sm transition-transform duration-500 hover:scale-[1.04]"
            />
          ))}
        </div>
      </section>

      {/* Chi siamo + punti di forza */}
      <section id="chi-siamo" style={softBg}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={chip}>
              Chi siamo
            </span>
            <h2 className={"mt-4 text-3xl font-bold " + headingFont}>
              Perché scegliere {lead.name}
            </h2>
            <p className="mt-4 text-zinc-600">
              Siamo una realtà di {lead.city ?? "Feltre"} che mette al centro le persone e la
              qualità del servizio. La nostra esperienza è al tuo servizio, ogni giorno.
            </p>
            <ul className="mt-6 space-y-3">
              {theme.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={primaryBg}>
                    ✓
                  </span>
                  <span className="text-sm text-zinc-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 rounded-2xl shadow-sm" style={tileA} />
            <div className="mt-8 h-40 rounded-2xl shadow-sm" style={tileB} />
            <div className="h-40 rounded-2xl shadow-sm" style={tileB} />
            <div className="mt-8 h-40 rounded-2xl shadow-sm" style={tileA} />
          </div>
        </div>
      </section>

      {/* Testimonianza */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="text-5xl leading-none" style={primaryText}>“</div>
        <p className={"mt-2 text-2xl font-medium leading-relaxed " + headingFont}>
          {theme.testimonial.quote}
        </p>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {theme.testimonial.author}
        </p>
        {lead.googleRating || lead.googleReviews ? (
          <p className="mt-2 text-sm text-zinc-500">
            <span className="font-semibold" style={primaryText}>
              {lead.googleRating ? lead.googleRating.toFixed(1) + "/5" : ""}
            </span>
            {lead.googleReviews ? " su " + lead.googleReviews + " recensioni Google" : ""}
          </p>
        ) : null}
      </section>

      {/* FAQ */}
      <section style={softBg}>
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-center">
            <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={chip}>
              FAQ
            </span>
            <h2 className={"mt-4 text-3xl font-bold " + headingFont}>Domande frequenti</h2>
          </div>
          <div className="mt-10 space-y-3">
            {theme.faqs.map((f, i) => (
              <details key={i} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer list-none font-semibold text-zinc-800">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA scura */}
      <section className="text-white" style={darkBg}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-16 text-center">
          <h2 className={"text-3xl font-bold " + headingFont}>Pronti a darvi il meglio</h2>
          <p className="max-w-xl text-white/70">
            Contattateci oggi stesso: saremo felici di rispondere a ogni vostra domanda.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {phone ? (
              <a href={"tel:" + phone} className="rounded-full bg-white px-7 py-3 font-semibold" style={primaryText}>
                Chiama {phone}
              </a>
            ) : null}
            {wa ? (
              <a href={wa} className="rounded-full border border-white/40 px-7 py-3 font-semibold text-white">
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* Contatti */}
      <section id="contatti" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className={"text-3xl font-bold " + headingFont}>Dove siamo</h2>
            <p className="mt-3 text-zinc-600">
              Siamo a {lead.city ?? "Feltre"}. Passa a trovarci o contattaci: ti rispondiamo subito.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              {lead.addressFull ? (
                <p className="flex items-center gap-2 text-zinc-700">
                  <span style={primaryText}>📍</span> {lead.addressFull}
                </p>
              ) : null}
              {phone ? (
                <p className="flex items-center gap-2 text-zinc-700">
                  <span style={primaryText}>📞</span> {phone}
                </p>
              ) : null}
              {lead.email ? (
                <p className="flex items-center gap-2 text-zinc-700">
                  <span style={primaryText}>✉️</span> {lead.email}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {phone ? (
                <a href={"tel:" + phone} className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={primaryBg}>
                  Chiama
                </a>
              ) : null}
              {wa ? (
                <a href={wa} className="rounded-full border px-5 py-2.5 text-sm font-semibold" style={softBorder}>
                  WhatsApp
                </a>
              ) : null}
              {lead.email ? (
                <a href={"mailto:" + lead.email} className="rounded-full border px-5 py-2.5 text-sm font-semibold" style={softBorder}>
                  Email
                </a>
              ) : null}
            </div>
            <div className="mt-8">
              <h3 className={"text-base font-semibold " + headingFont}>Orari di apertura</h3>
              <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                {hoursRows.map((r, i) => (
                  <li key={i} className="flex justify-between gap-4 border-b border-zinc-100 py-1">
                    <span>{r.d}</span>
                    <span className="font-medium text-zinc-800">{r.h}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-zinc-400">Orari indicativi: aggiornali in base alle tue esigenze.</p>
            </div>
          </div>
          {formAction ? (
            <form method="POST" action={formAction} className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
              <h3 className={"text-lg font-semibold " + headingFont}>Prenota / Richiedi informazioni</h3>
              <p className="mt-1 text-sm text-zinc-500">Compila il modulo: ti rispondiamo al piu presto.</p>
              <input type="hidden" name="_captcha" defaultValue="false" />
              <input type="hidden" name="_subject" defaultValue={"Nuova richiesta dal sito " + lead.name} />
              <input type="hidden" name="_template" defaultValue="table" />
              <div className="mt-4 space-y-3">
                <input name="nome" required placeholder="Nome e cognome" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                <input name="telefono" placeholder="Telefono" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                <input name="richiesta" placeholder="Data / numero persone / servizio" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                <textarea name="messaggio" rows={3} placeholder="Il tuo messaggio" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                <button type="submit" className="w-full rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={primaryBg}>
                  Invia richiesta
                </button>
                <p className="text-center text-xs text-zinc-400">Modulo dimostrativo. Le richieste arrivano via email.</p>
              </div>
            </form>
          ) : (
            <div className="min-h-[260px] rounded-2xl" style={heroBg} />
          )}
        </div>
        {/* Mappa Google integrata */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-100 shadow-sm">
          <iframe
            src={mapSrc}
            title={"Mappa - " + lead.name}
            className="h-72 w-full border-0"
            loading="lazy"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-10 text-center text-xs text-zinc-400">
        <p className={"text-sm font-semibold " + headingFont} style={primaryText}>
          {theme.emoji} {lead.name}
        </p>
        <p className="mt-1">{subtitle}</p>
        <p className="mt-3">Sito dimostrativo creato da {brandName} · {year}</p>
      </footer>

      {/* Pulsante WhatsApp flottante */}
      {wa ? (
        <a
          href={wa}
          className="float-btn no-print fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg transition-transform hover:scale-110"
          style={primaryBg}
          aria-label="Scrivici su WhatsApp"
        >
          💬
        </a>
      ) : null}
    </main>
  );
}
