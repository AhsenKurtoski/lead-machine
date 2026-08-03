# Lead Machine Website — Verification Checklist

## Asset e Dizionari
- [ ] Checkpoint 1: Cartella website/public/product-screenshots/ contiene almeno 5 PNG screenshot + logo.png + favicon.ico + icon-192x192.png + icon-512x512.png + apple-touch-icon.png
- [ ] Checkpoint 2: website/public/site.webmanifest esiste con name, icons 192/512, start_url /en, theme_color indigo
- [ ] Checkpoint 3: website/public/robots.txt esiste con `User-agent: *` + `Sitemap: https://leadmachine.dev/sitemap.xml`
- [ ] Checkpoint 4: Chiavi dizionario mancanti (docs, about, blog, changelog, roadmap, contributors, status, forms x4, welcome, notFound, error) aggiunte in TUTTE e 7 lingue (en/it/de/fr/sl/es/pt). Nessun "namespace.key" non tradotto visualizzabile in console.

## Componenti & Utility
- [ ] Checkpoint 5: src/hooks/use-in-view.tsx esiste e usa IntersectionObserver con triggerOnce, threshold 0.15, rootMargin -50px
- [ ] Checkpoint 6: src/components/ui/toast.tsx + use-toast.ts + toaster.tsx esistono (Radix UI)
- [ ] Checkpoint 7: `<Toaster />` montato globalmente in src/app/[locale]/layout.tsx
- [ ] Checkpoint 8: Button variant="gradient" corretta (bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500, hover ombra spostamento, 200% bg-size, animate gradient-x)

## Gruppo A Core Marketing (8 pagine)
- [ ] Checkpoint 9: Home page (/) ha badge FREE, H1 titleHighlight, 3 CTA, mockup Macbook mockup-frame, 4 stat cards gradienti, Bento 6 cards asimmetrico, 3-step numerato, social proof + logos 6 brands griglia, FAQ accordion 8, final CTA grande
- [ ] Checkpoint 10: Features (/features) ha 5 Tabs shadcn funzionanti, ogni tab 4 feature cards con icona lucide. Carousel embla 5 screenshot dots + autoplay 5s.
- [ ] Checkpoint 11: Pricing (/pricing) 2 cards BYOK + Self-Hosted entrambe €0, comparison table 12 righe × 2 colonne tutte ✅ Sì, FAQ accordion 5 domande
- [ ] Checkpoint 12: BYOK-Lifetime (/byok-lifetime) Tab1 6 step AES-GCM flow + code block monospace da lib/crypto.ts + badge GitHub auditabile. Tab2 5 Ironclad Promises cards.
- [ ] Checkpoint 13: Transparency (/transparency) 5 cards numerate: Data=ZERO, Cookies 3 tecnici, OSS audit, Security posture, Financial survival — ogni card con body lungo e newlines preservati.
- [ ] Checkpoint 14: Deploy (/deploy) 3 cards Laptop/VPS/Serverless ognuna 3 step pre/code blocks monospace.
- [ ] Checkpoint 15: Docs (/docs) link tree 12 sezioni con cards.
- [ ] Checkpoint 16: About (/about) mission/storia/valori, team 6 membri Avatar, manifesto SaaS subscriptions.

## OPEN SOURCE ANTI-PAYMENT CLEANUP (PRIMA DI TUTTO)
- [ ] Checkpoint 17: **Sezione `legal.refund` ELIMINATA in tutte le 7 lingue + chiave `nav.legal.refund` rimossa in 7 lingue.**
- [ ] Checkpoint 18: **`generateLicenseKey()` eliminato da `lib/utils.ts`. "refund" rimosso da LEGAL_KEYS in navbar.tsx + footer.tsx.**
- [ ] Checkpoint 19: **Terms neutralizzati**: sezioni 1-9 (license code rimossa, sezione 4 rinominata "MIT License & Open Source Rules" con testo MIT ufficiale). Definitions d) licensed build rimossa. terms.changes.body "Paid Licensed Build features are not retroactively disabled" cancellato. terms.liability (c) sostituito "€100 EUR max aggregate".
- [ ] Checkpoint 20: **lm_license cookie description** cambiato in "Reserved for future OSS enterprise features — 100% NOT SET in current release" in TUTTE le lingue.
- [ ] Checkpoint 21: **dpa.body** rimosso "paid custom-build deployments, private managed instances, enterprise support services" → sostituito con testo neutro.
- [ ] Checkpoint 22: **privacy.collected / privacy.retention / privacy.purposes** rimossi refs a "license key records custom builds".
- [ ] Checkpoint 23: **Grep anti-payment PULITO**: `refund|license.?key|license.?code|paid.?service|purchased|stripe|charge|billing|credit.?card|credito|rimbors|pagamento.*a|abbonament.*pag` in messages/ + src/ (escluso node_modules) = 0 match (tranne "MIT-licensed" OK).

## Gruppo C Legali (6 PAGINE SOLAMENTE — REFUND ELIMINATO: NON ESISTE PIÙ)
- [ ] Checkpoint 24: Privacy (/privacy) 9 sezioni complete (no license refs): Data Controller IT00000000000, Collected (forms+sources+NOT list), Purposes, Base Art.6 GDPR, Retention 36 mesi, Rights Artt.15-22, Cookies link, Transfer SCC EU-US, Garante Autorità, Changes 31 lug 2026.
- [ ] Checkpoint 25: Terms (/terms) 9 sezioni NO PAID: Definitions (no d licensed build), Service, Account, MIT License Rules, Prohibited conduct, Liability €100 max aggregate, Jurisdiction Foro di Milano, Changes, Contacts.
- [ ] Checkpoint 26: Cookies (/cookies) INTRO Art.122 + What are + Strictly Necessary + TABELLA 4 colonne × 3 righe (next-intl-locale 1a, lm_license "Reserved NOT SET" 10a, lm_consent 90g) + EXPLICITLY NOT USED lista GA/Meta/LinkedIn/Hotjar/AdRoll/Criteo.
- [ ] Checkpoint 27: Imprint (/imprint) IT+DE TMG §5, nome, P.IVA, sede Via Privacy 1 Milano, PEC, REA, Capitale €10k, responsabile contenuti, liability links esterni.
- [ ] Checkpoint 28: DPA (/dpa) Art.28 GDPR, Modulo UE SCC 2021/914, TOMs Annex, button Download PDF (nessun "paid" reference).
- [ ] Checkpoint 29: Security (/security) policy intro + link SECURITY.md, vulnerabilità disclosure PGP security@leadmachine.dev, rate limiting, input sanitization, secrets redacted.

## Gruppo B Secondarie (10 pagine)
- [ ] Checkpoint 30: Blog (/blog) index lista 3 cards + 3 pagine detail /blog/[slug] con articoli completi MD o JSON-parsed HTML.
- [ ] Checkpoint 31: Changelog (/changelog) timeline verticale sinistra pallini colorati 8 entries v1.0.0 → v1.4.2, tag Added Changed Fixed Removed data versione.
- [ ] Checkpoint 32: Roadmap (/roadmap) Kanban 3 colonne Done/InProgress/Planned ~30 items totale ognuno titolo+descrizione+categoria+upvote statico.
- [ ] Checkpoint 33: Contributors (/contributors) griglia 30 avatar iniziali o immagini GitHub fake, badge Contributor, stats commits PR LOC.
- [ ] Checkpoint 34: Status (/status) 6 sistemi Operational verdi, uptime 99.98% sparklines gradient mini, 0 incidents 30gg.
- [ ] Checkpoint 35: Demo Request (/demo-request) form 6 campi + checkbox consenso + validazione + toast successo.
- [ ] Checkpoint 36: Partnership (/partnership) radio tipo partnership Agency/Influencer/OSS/Other + Nome/Email/Canale follower + Proposta textarea + toast.
- [ ] Checkpoint 37: Report Issue (/report-issue) Title, Radio Bug/Feature/Question, Steps textarea, Expected vs Actual, Browser+OS select, Severità L/M/H/C, UI Screenshot upload placeholder, Email opt.
- [ ] Checkpoint 38: Waitlist (/waitlist) referral program 3 amici=50% / 10 amici=100%, input email, referral link generato https://leadmachine.dev/r/USER123 fake, progress bar invites.
- [ ] Checkpoint 39: Welcome (/welcome) onboarding 3 step visuali con screenshots.

## Error Pages & Loading (4 file)
- [ ] Checkpoint 40: [locale]/not-found.tsx 404 grande gradient + frase divertente + Torna Home + skeleton shimmer.
- [ ] Checkpoint 41: [locale]/error.tsx "use client" con props error+reset, AlertTriangle illustrazione gradient + Riprova reset() button.
- [ ] Checkpoint 42: [locale]/loading.tsx 1600px skeletons navbar + hero 3 blocchi + grid 6 cards skeleton shimmer.
- [ ] Checkpoint 43: app/loading.tsx versione compatta globale.

## Build & Typecheck
- [ ] Checkpoint 44: `npm.cmd run build` exit code 0. Nessun errore. SSG: tutte le route in output build sono statiche (simbolo ○).
- [ ] Checkpoint 45: `npm.cmd run typecheck` (tsc --noEmit) exit code 0. 0 TypeScript errors. 0 @ts-ignore. 0 any implicito.

## GitHub & Vercel
- [ ] Checkpoint 46: Repository GitHub pubblico creato github.com/lead-machine/lead-machine-website (o utente). Descrizione corretta. MIT License.
- [ ] Checkpoint 47: Commit iniziale pushato. Node_modules, .next, .env, tests/screenshots-test ESCLUSI (presenti in .gitignore). ~31 pagine sorgenti presenti (REFUND PAGE ELIMINATA: 0 refs).
- [ ] Checkpoint 48: Deploy Vercel produzione completato. URL pubblico ritorna 200 per /en, /en/pricing, /en/byok-lifetime, /en/privacy.

## Playwright Screenshot Audit 31 Pagine (32 - refund rimosso)
- [ ] Checkpoint 49: Dev server avviato 3001 o deploy pubblico disponibile.
- [ ] Checkpoint 50: 31 file PNG salvati in website/tests/screenshots-test/ (o percorso equivalente).
- [ ] Checkpoint 51: Controllo random 10 screenshot: nessun errore React visibile, nessun t() missing "namespace.key", layout responsive senza orizzontale overflow, colori gradient hero coerenti.

## Compliance & Tracking (ZERO TRACKER + ZERO PAYMENT)
- [ ] Checkpoint 52: Grep in HTML prodotto per `google-analytics`, `gtag(`, `ga(`, `fbq(`, `dataLayer`, `_gaq.push`, `hotjar`, `hj()`, `sentry` → 0 occorrenze.
- [ ] Checkpoint 53: Nessuna chiamata network a google-analytics.com, facebook.com, connect.facebook.net, px.ads.linkedin.com, cdn.sstatic, segment.com. Solo next/font/google o self-host.
- [ ] Checkpoint 54: ZERO PAGAMENTI: Grep per `refund, licenseKey, licenseCode, credit.card, payment, Stripe, checkout, invoice.paid` = 0 nel codice applicativo src/ e dizionari messages/ (solo "licensed" = MIT-licensed è OK).

## Accessibilità WCAG 2.1 AA
- [ ] Checkpoint 55: Navbar skip-link, semantic <main id="main-content">, <header>, <footer>, landmarks corrette.
- [ ] Checkpoint 56: Contrasti AA: bianco #fff vs foreground sl-900 OK. dark #0B0F19 vs white OK. Primary indigo-600 testati.
