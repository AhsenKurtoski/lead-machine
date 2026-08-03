# Lead Machine Website — Product Requirement Document

## Overview
- **Summary**: Realizzazione del sito vetrina marketing multilingua per Lead Machine, CRM open-source di lead generation per freelancer. Il progetto include 32 pagine in 7 lingue (it, de, fr, sl, en, es, pt), design Apple/Linear-level con glassmorphism e bento grid, crittografia BYOK AES-GCM 256-bit dimostrata, pagine legali complete (GDPR-compliant), e deploy Vercel.
- **Purpose**: Sostituire lo stack SaaS da ~€200/mo per i freelancer con una soluzione open-source gratuita e self-hosted, dimostrando il valore di Lead Machine tramite UI enterprise, contenuti reali e trasparenza totale.
- **Target Users**: Freelancer, piccole web agency (1-5 persone), sviluppatori indipendenti, consulenti IT in Europa e globalmente.

## Goals
- Implementare 32 pagine complete e SSG-forced per performance 95+ Lighthouse
- 7 lingue con routing /[locale] e tutte le chiavi tradotte
- Design Apple/Linear/Vercel con bento grid, glassmorphism, gradient hero, skeleton shimmer, scroll reveal
- Pagine legali 100% complete da dizionario (nessun placeholder)
- Build Next.js + TypeScript strict con 0 errori
- Deploy pubblico Vercel + repo GitHub pubblico
- Screenshot audit 32 pagine tramite Playwright

## Non-Goals (Out of Scope)
- Nessun backend/pagamenti/Stripe (tutto €0 gratuito)
- Nessun analytics/tracker profilazione
- Nessuna funzionalità CRM vera nel sito (solo marketing)
- Nessuna CI/CD custom oltre al deploy base Vercel
- Nessun test E2E automatizzato oltre gli screenshot audit
- Nessun CMS esterno (blog markdown statico)

## Background & Context
- Stack già pronto: Next.js 14.2.15 App Router + TypeScript strict
- Componenti shadcn/ui 20+ già installati (button, card, tabs, accordion, dialog, input, textarea, select, radio-group, checkbox, toast via Radix)
- Sistema i18n next-intl già configurato con 7 lingue
- Colori: Indigo #4f46e5 primary, Violet #8b5cf6 accent, Fuchsia gradient, Dark #0B0F19
- Utility classes pronte: glassmorphism, card-hover, btn-grad-primary, badge-grad, skeleton-shimmer, mockup-frame
- Crypto.ts AES-GCM 256 + PBKDF2 100k iterazioni già funzionante
- Dizionario messages/*.json con 325+ chiavi (mancano blog/changelog/roadmap/docs/about/status/forms/welcome)

## Functional Requirements
- **FR-1**: Home page con hero, 4 stats, bento 6 features, 3-step "come funziona", social proof 6 logos, FAQ 8, final CTA + scroll reveal hook
- **FR-2**: Features page con 5 tabs (Research/CRM/Quotes/AI/Privacy) × 4 cards + carousel 5 screenshot embla
- **FR-3**: Pricing con 2 cards €0 + comparison table 12 righe + FAQ 5
- **FR-4**: BYOK-Lifetime con 2 tabs (crypto flow 6 steps + code block, zero-knowledge 5 promises)
- **FR-5**: Transparency 5 cards (data=zero, cookies 3 tecnici, OSS audit, security, financial)
- **FR-6**: Deploy 3 cards (Laptop/VPS/Serverless) × 3 step code blocks
- **FR-7**: Docs link tree 12 sezioni con cards
- **FR-8**: About mission/history/values/6 team avatars/manifesto
- **FR-9**: Blog index + 3 articoli markdown completi in src/content/blog
- **FR-10**: Changelog timeline v1.0.0 → v1.4.2 con 8 entries + tag Added/Changed/Fixed
- **FR-11**: Roadmap Kanban 3 colonne ~30 items con upvote
- **FR-12**: Contributors wall 30 fake GitHub avatars
- **FR-13**: Status page tutti sistemi Operational 99.98% uptime sparklines
- **FR-14**: Demo Request Form completo + toast Sonner
- **FR-15**: Partnership Form con tipo partnership radio
- **FR-16**: Report Issue Form con severity/category/browser select
- **FR-17**: Waitlist programma referral 3 amici = 50% / 10 amici = 100%
- **FR-18**: Welcome onboarding 3 step visuale
- **FR-19**: Pagine legali complete 100% Open Source MIT: privacy (9 sezioni GDPR senza licensed builds), terms (9 sezioni, no paid/licensed builds, no license codes, no refund), cookies (tabella 2+1 cookie tecnici, lm_license come reserved not-used), imprint IT+DE TMG, DPA Art.28 SCC, security policy. **Nessuna pagina /refund (eliminata: essendo tutto MIT gratuito non esiste rimborso)**
- **FR-20**: [locale]/not-found.tsx + error.tsx (use client) + loading.tsx × 2
- **FR-21**: Asset pubblici: copia screenshots + favicon + icons + site.webmanifest + robots.txt
- **FR-22**: Aggiunta chiavi dizionario mancanti per tutte le pagine/forms/blog/roadmap in TUTTE le 7 lingue
- **FR-23**: Build & typecheck 0 errori
- **FR-24**: Repo GitHub pubblico "lead-machine-website" + push codice
- **FR-25**: Deploy Vercel produzione
- **FR-26**: Screenshot 31 pagine Playwright in tests/screenshots-test

### **NEW FR-27 — TASK 0: Open Source Cleanup (pre-task, anti-pagamenti)**
- Elimina sezione `legal.refund` in TUTTE e 7 lingue (en/it/de/fr/sl/es/pt). Elimina chiave `nav.legal.refund` in 7 lingue.
- Neutralizza refs a "purchased, paid, licensed builds, license keys, license codes": (1) terms.license, terms.licenseCode → rinomina+ristruttura in "MIT License & Open Source Rules" (sezione sola 4/5), (2) lm_license cookie description: "reserved not used", (3) terms.changes.body rimuovi Paid Licensed Build ref, (4) dpa.body rimuovi paid custom-build ref, (5) privacy.collected/privacy.retention rimuovi refs a license records custom builds.
- Elimina funzione `generateLicenseKey()` da lib/utils.ts.
- Rimuovi "refund" da LEGAL_KEYS array in navbar.tsx e footer.tsx.
- **Verifica finale**: `cd website; grep -rE "refund|license.key|license.code|paid.service|purchased|stripe|charge|billing|credit.card|credito|rimbors|pagamento.*a|abbonament.*pag" messages/ src/ — escluso node_modules. 0 occorrenze tranne "licensed" = "MIT-licensed" o "licensed open-source".`

## Non-Functional Requirements
- **NFR-1**: SSG forced statico (force-static, revalidate false) per tutte le pagine
- **NFR-2**: Lighthouse target 95+ Performance, Accessibility, Best Practices, SEO
- **NFR-3**: WCAG 2.1 AA — semantica corretta, aria-labels, contrasti
- **NFR-4**: Nessun tracker: 0 GA, 0 Meta, 0 Hotjar, 0 Sentry default
- **NFR-5**: TypeScript strict, nessun `any`, nessun @ts-ignore
- **NFR-6**: Max container 7xl (1280px) centered
- **NFR-7**: Animazioni 300ms ease-out, translate 4px lift, fade-in-up
- **NFR-8**: Next.js security headers in next.config.mjs

## Constraints
- **Technical**: Next.js 14 App Router, TypeScript strict, Tailwind, shadcn/ui new-york, Radix UI, next-intl, lucide-react, embla-carousel-react. NESSUNA dipendenza aggiuntiva oltre package.json già esistente.
- **Business**: 100% gratuito MIT, nessun pagamento, nessun credito card richiesto. Tutte le feature incluse.
- **Dependencies**: Chiavi dizionario devono essere aggiunte in messages/*.json per tutte le 7 lingue per i contenuti mancanti (blog, changelog, roadmap, docs, about, status, forms, welcome, not-found)

## Assumptions
- Chiavi dizionario mancanti verranno aggiunte con contenuti reali (non placeholder) in tutte e 7 le lingue, usando inglese come sorgente + traduzioni consistenti per it/de/fr/sl/es/pt
- Screenshot disponibili in public/screenshots/*.png (3 PNG al momento) verranno usati + dupplicati rinominati per carousel 5 screenshot
- Form lato client senza backend, toast Sonner per feedback successo
- Fake data per team 6, contributors 30, roadmap 30 items, changelog 8 entries verranno generati realistici
- Repository GitHub e deploy Vercel verranno eseguiti con account utente disponibile

## Acceptance Criteria

### AC-1: Home Page Completa
- **Given**: Server Next.js avviato sulla porta 3001
- **When**: L'utente naviga a /en
- **Then**: Visualizza hero con badge "100% Free Forever · MIT License", H1 + subtitle, 3 CTA, mockup Macbook, 4 stats gradient, bento 6 features con icone lucide, 3-step come funziona, social proof + 6 logos, FAQ accordion 8 domande, final CTA grande. Scroll reveal con IntersectionObserver.
- **Verification**: `human-judgment`

### AC-2: SSG Forced Static
- **Given**: Qualsiasi pagina in src/app/[locale]/...
- **When**: Build `npm run build` viene eseguito
- **Then**: Tutte le pagine contengono `export const dynamic = "force-static"; export const revalidate = false;` e sono generate come statiche (○ in output build, non λ/●)
- **Verification**: `programmatic`

### AC-3: SEO Metadata
- **Given**: Una qualsiasi pagina
- **When**: C'è `generateMetadata` che legge da t("meta.title") / t("meta.description") o da namespace specifico per pagina
- **Then**: `<title>`, `<meta name="description">`, OpenGraph, alternate canonicals per 7 lingue sono renderizzati correttamente nell'HTML
- **Verification**: `programmatic`

### AC-4: Pagine Legali Zero Placeholder + Zero Riferimenti Pagamenti
- **Given**: /privacy, /terms, /cookies, /imprint, /dpa, /security (6 pagine — **refund ELIMINATO** perché tutto gratuito MIT)
- **When**: Controllo le pagine
- **Then**: (a) Nessuna pagina /refund esiste. (b) Nessun testo menziona "paid services, purchased licensed builds, credit card, subscriptions a pagamento, refund". (c) Privacy 9 sezioni + Terms 9 sezioni (license code sezione rimossa) + Cookie tabella 3 righe ma lm_license="reserved not used" + Imprint IT/DE + DPA + Security.
- **Verification**: `human-judgment` + `programmatic` (grep per refund/purchased/licensed build)

### AC-5: 31 Pagine Renderizzate (32 - 1 refund rimosso)
- **Given**: Elenco 31 route: /, /features, /pricing, /byok-lifetime, /transparency, /deploy, /docs, /about, /blog, /blog/[slug]×3, /changelog, /roadmap, /contributors, /status, /demo-request, /partnership, /report-issue, /waitlist, /welcome, /privacy, /terms, /cookies, /imprint, /dpa, /security, not-found, error, loading
- **When**: Dev server avviato
- **Then**: Ogni route restituisce 200 e contenuto completo renderizzato. /refund restituisce 404.
- **Verification**: `programmatic` (Playwright HTTP status + /refund 404)

### AC-6: Nessun Tracker
- **Given**: HTML prodotto da qualsiasi pagina
- **When**: Cerco pattern ga(, fbq, dataLayer, tr, sendinblue, hotjar, _stracker, sentry
- **Then**: 0 occorrenze trovate. Nessuna chiamata a domini esterni oltre a OpenStreetMap attribution badges e fonts Google? (Font devono essere self-hosted o system fonts — no Google Fonts calls)
- **Verification**: `programmatic` (grep + network log)

### AC-7: Build 0 Errori
- **Given**: Cartella website
- **When**: Eseguo `cd website ; npm.cmd run build`
- **Then**: Exit code 0, nessun errore TypeScript o build
- **Verification**: `programmatic`

### AC-8: Typecheck 0 Errori
- **Given**: Cartella website
- **When**: Eseguo `cd website ; npm.cmd run typecheck` (tsc --noEmit)
- **Then**: Exit code 0, 0 errori
- **Verification**: `programmatic`

### AC-9: Deploy Vercel Pubblico
- **Given**: Codice pushato su GitHub repo lead-machine-website
- **When**: `vercel --prod --yes` completato
- **Then**: Dominio pubblico xxx.vercel.app restituisce 200 con sito completo
- **Verification**: `programmatic`

### AC-10: i18n 7 Lingue Complete
- **Given**: 7 lingue it/de/fr/sl/en/es/pt
- **When**: Visito /it /de /fr /sl /en /es /pt e qualsiasi sottopagina
- **Then**: Nessun t() missing ("namespace.key" non tradotto) visualizzato. Tutte le chiavi presenti.
- **Verification**: `human-judgment` + grep per "Missing message" in console

### AC-11: BYOK Crypto Tab Corretta
- **Given**: /byok-lifetime Tab 1
- **When**: Visualizzo il flusso 6 steps + code block
- **Then**: Gli step corrispondono esattamente alla realtà di lib/crypto.ts (salt, IV, fingerprint, PBKDF2 100k, AES-GCM, base64 localStorage). Code block mostra snippet da crypto.ts.
- **Verification**: `human-judgment`

### AC-12: Cookie Tabella 3 Righe + Explicitly NOT
- **Given**: /cookies
- **When**: Visualizzo la pagina
- **Then**: Tabella HTML con 4 colonne (Cookie name, Purpose, Duration, Controller) × 3 righe esatte (next-intl-locale, lm_license, lm_consent). Sotto: lista esplicita COOKIE EXPLICITLY NOT USED (GA, Meta, LinkedIn, Hotjar, ecc.)
- **Verification**: `human-judgment`

### AC-13: Playwright Screenshot 32 Pagine
- **Given**: Dev server in esecuzione 3001
- **When**: Script Playwright eseguito
- **Then**: 32 file PNG salvati in website/tests/screenshots-test/*.png. Tutte le immagini esistono e hanno >0 byte.
- **Verification**: `programmatic` (count files)

## Open Questions
- [ ] Confermato: il pricing è TUTTO €0, quindi refund policy è solo per custom builds (come da chiavi legal.refund.intro). Non serve pagina "pagamenti". Resolved: SI.
- [ ] Form demo/partnership/report/waitlist: solo toast client-side, NO backend. Resolved: SI.
- [ ] Screenshot disponibili 3 file in public/screenshots: ne servono 5 per carousel. Soluzione: duplicare/rinominare e usare quelli. Resolved: SI.
- [ ] Fonts: Attualmente Inter + JetBrains Mono da Google? Necessario self-host o next/font/google. Resolved: usare next/font/google che è standard in Next.js 14 (non è tracker, è font self-host via next/font).
