# Lead Machine Website — The Implementation Plan (Decomposed and Prioritized Task List)

## [/] Task 0: OPEN SOURCE CLEANUP — Rimuovi Refund, Licensed Builds, Payment Refs (PRIMA DI TUTTO)
- **Priority**: critical (blocking)
- **Depends On**: None
- **Description**:
  - **ELIMINARE**:
    1. Sezione `legal.refund` completa in TUTTE e 7 lingue (en.json, it.json, de.json, fr.json, sl.json, es.json, pt.json) — 18-20 righe ognuno.
    2. Chiave `nav.legal.refund` in TUTTE e 7 lingue.
    3. Funzione `generateLicenseKey()` in `src/lib/utils.ts` (righe 25-33).
    4. Stringa `"refund"` dall'array `LEGAL_KEYS` in [navbar.tsx](file:///C:/Users/anelk/Desktop/lead-machine/website/src/components/navbar.tsx#L34) (riga ~38) e [footer.tsx](file:///C:/Users/anelk/Desktop/lead-machine/website/src/components/footer.tsx#L8) (riga ~12).
  - **RISTRUTTURARE / NEUTRALIZZARE**:
    1. **legal.terms.license + licenseCode (inglese e 6 altre lingue)**: Elimina sezione "licenseCode" completamente. Rinomina "license" (4. Lifetime License Rights) in **"4. MIT License & Open Source Rules"** con testo nuovo: riepilogo MIT (perpetual, world-wide, royalty-free, modification/distribution/sublicense/sale consentiti, NO WARRANTY, AS IS, liability disclaimer). **RINUMERA SEZIONI**: le 10 sezioni originali diventano 9 (elimina la 5 license code, le altre scalano 6→5 ... 10→9).
    2. **legal.terms.definitions.body**: Rimuovi lettera `d) "Licensed Build" means a custom, paid binary...` e rinomina e) → d).
    3. **legal.terms.changes.body**: Rimuovi frase `"provided that critical Paid Licensed Build features are not retroactively disabled"` → lascia solo `"... with or without notice. Material changes..."`.
    4. **legal.terms.liability.body (c)**: Sostituisci `"€100 EUR or the total amount paid by the User to Lead Machine in the 12 months preceding the claim, whichever is higher."` → `"€100 EUR (maximum aggregate)"` (non esistono pagamenti).
    5. **legal.cookies.table.rows[1] (lm_license cookie)**: Sostituisci `"If applicable: stores a license key string for custom Licensed Builds. Never set on the open-source free version."` → `"Reserved cookie name for future optional OSS enterprise features. 100% NOT SET in the current open-source release."` (stessa modifica in tutte le 7 lingue).
    6. **legal.dpa.body**: Sostituisci `"Users who procure paid custom-build deployments, private managed instances, or enterprise support services"` → `"Users who run community or self-hosted custom deployments, or who request a signed DPA for compliance reasons"`.
    7. **legal.privacy.collected.body**: Rimuovi riferimento a `"c) License key records, if any: lifetime licenses are associated with purchaser email for verification"` se presente. Lascia solo a) contact form data, b) server logs, c) explicitly do NOT collect list.
    8. **legal.privacy.retention.body**: Rimuovi paragrafo `"— License key records (custom builds only): 10 years from purchase..."` se presente.
    9. **legal.privacy.purposes.body**: Rimuovi `"... Managing custom-build license keys..."` se presente.
  - **VERIFICA FINALE**: Dopo tutte le modifiche, verifica che in `messages/` e `src/` (ESCLUDI node_modules):
    - grep `-iE "refund|license[_\- ]?key|license[_\- ]?code|paid[_\- ]?service|purchased|stripe|charge|billing|credit[_\- ]?card|credito|rimbors|Pagamento.*a|Abbonament.*pag" messages/ src/` restituisca **0 MATCHES** tranne `"MIT-licensed"` o `"licensed open-source"` (che sono OK).
- **Acceptance Criteria Addressed**: AC-4, AC-5 (a metà /refund 404)
- **Test Requirements**:
  - `programmatic` TR-0.1: Grep in messages/*.json per "refund" ritorna 0 (case-insensitive).
  - `programmatic` TR-0.2: `generateLicenseKey` non presente in utils.ts. LEGAL_KEYS in navbar/footer non contengono "refund".
  - `programmatic` TR-0.3: Grep generale per i pattern sopra = 0 match (tranne MIT-licensed OK).
  - `human-judgement` TR-0.4: Controllo manuale terms.json sezione 4 ("MIT License & Open Source Rules") e 9 sezioni numerate 1-9 correttamente.
- **Notes**: Dopo questo Task, /refund page NON deve essere creata. Il conteggio pagine legali va da 7 a 6.

## [ ] Task 1: Setup Assets & Aggiungi Chiavi Dizionario Mancanti (7 Lingue)
- **Priority**: high
- **Depends On**: Task 0
- **Description**:
  - *NOTA 2026-08-02: Assets GIÀ COPIATI (public/product-screenshots, public/*.png, favicon, robots.txt, site.webmanifest esistono! Verifica e saltalo se OK).*
  - Aggiungi a TUTTI e 7 i messages/*.json (en.json come sorgente, poi it/de/fr/sl/es/pt) le chiavi mancanti per: docs, about, blog (index + 3 articoli), changelog (8 entries), roadmap (3 colonne 30 items), contributors (30 persone), status, demo-request form, partnership form, report-issue form, waitlist, welcome onboarding 3 step, notFound, error, loading. Aggiungi anche meta.license, nav.partnership, nav.reportIssue (o nav.partnership/nav.reportIssue se mancano).
- **Acceptance Criteria Addressed**: AC-10 (i18n completo)
- **Test Requirements**:
  - `programmatic` TR-1.1: Tutte le nuove chiavi esistono in en.json e sono presenti in TUTTE le altre 6 lingue (it, de, fr, sl, es, pt).
  - `human-judgement` TR-1.2: Revisione contenuti blog/roadmap/changelog: nessun "TODO", nessun "lorem ipsum", testi reali e consistenti.
- **Notes**: Per le chiavi duplicate o strutture complesse (blog posts, changelog entries, roadmap items) usa array/object strutturati nei JSON.

## [ ] Task 2: Utility Hooks & Componenti Aggiuntivi Mancanti
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Crea `src/hooks/use-in-view.tsx` — hook IntersectionObserver che restituisce isIntersecting + ref, threshold 0.15, rootMargin 0px 0px -50px 0px, triggerOnce true.
  - Crea componente `src/components/ui/toast.tsx` e `src/components/ui/use-toast.ts` + `src/components/ui/toaster.tsx` (toast Sonner via Radix — @radix-ui/react-toast è già installato in package.json? Sì, già presente). Componente Toaster globale da montare in layout.
  - Aggiungi `variant="gradient"` a Button se non esiste (controlla button.tsx). Deve matchare btn-grad-primary class.
  - Verifica e crea eventualmente `src/components/ui/checkbox.tsx` (shadcn checkbox via @radix-ui/react-checkbox — verificare installazione. Non installato in package.json. Alternativa: implementa checkbox nativo styled invece di dipendenza).
  - Aggiungi Toaster in `[locale]/layout.tsx` dentro <NextIntlClientProvider>.
- **Acceptance Criteria Addressed**: AC-1 (scroll reveal), AC-13 (toast form)
- **Test Requirements**:
  - `programmatic` TR-2.1: Compilazione TypeScript OK per nuovi file (tsc --noEmit)
  - `human-judgement` TR-2.2: Button gradient ha stile indigo→violet→fuchsia corretto. Toast appare nell'angolo con animazione.
- **Notes**: Per checkbox, evita nuove dipendenze: usa `<input type="checkbox" className="shadcn-styled">` con styling tailwind inline.

## [ ] Task 3: Gruppo A — Pagine Core Marketing (Home, Features, Pricing)
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - HOME `src/app/[locale]/page.tsx`: Server component + SSG force-static. generateMetadata da meta.hero. Hero con Badge "🎁 100% Free Forever · MIT License", H1 two-line, subtitle, 3 CTA, mockup Macbook 16" mockup-frame + /product-screenshots/*.png. 4 stat cards (40M, 195, 7, 0) con numeri gradient text. Bento grid 2+1 6 cards (Research, CRM, Quotes, AI, Privacy, Self-Hosted) con icone lucide (Map, UsersScroll, FileText, Sparkles, ShieldCheck, Server). 3-step (1 Ricerca OSM, 2 CRM&Score, 3 Preventivi PDF). Social proof 3200+ freelancers + logos 6 brand (MIT, OpenStreetMap, Vercel, Prisma, Tailwind, shadcn) griglia opaca 50%. FAQ accordion 8 domande (pricing.faq.q1..q8 — ma ne ho 5 in dizionario attuale, aggiungi altre 3 in Task 1). Final CTA grande gradient "Get Started — It's €0, really". Applica use-in-view su ogni section per reveal fade-in-up.
  - FEATURES `src/app/[locale]/features/page.tsx`: Tabs shadcn 5 sezioni. Ogni tab 4 feature cards con icona + title + description. Sotto: 5 screenshot carousel con embla-carousel-react (dots, autoplay 5s, loop).
  - PRICING `src/app/[locale]/pricing/page.tsx`: 2 cards pricing affiancate (BYOK left, Self-Hosted right). Entrambe €0, CTA gradient. Sotto comparison table 12 righe × 2 colonne (tutte ✅ Sì). Sotto FAQ accordion 5.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: Le 3 pagine esportano `dynamic = "force-static"` + `revalidate = false`. Build SSG (○) per tutte.
  - `human-judgement` TR-3.2: Home bento grid asimmetrica visivamente corretta. Features tabs switchano smooth senza layout shift. Pricing cards responsive mobile (stack verticale). Nessun testo placeholder.

## [ ] Task 4: Gruppo A Continuazione — (BYOK, Transparency, Deploy, Docs, About)
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - BYOK-LIFETIME `src/app/[locale]/byok-lifetime/page.tsx`: 2 Tabs shadcn. Tab 1 "How AES-GCM encryption works" — 6 step byok.crypto.step1-6 numerati + code block JetBrains Mono syntax highlighted (solo bg-muted rounded-lg p-4 font-mono text-sm con snippet da lib/crypto.ts: encrypt/decrypt flow). Badge security "The crypto is 100% auditable in lib/crypto.ts on GitHub" + link GitHub. Tab 2 "Zero-Knowledge Promise" — Le 5 Ironclad Promises (prom1-5) in cards con icona Shield.
  - TRANSPARENCY `src/app/[locale]/transparency/page.tsx`: 5 sections cards con numero progressivo cerchiato + icona + titolo + body lungo (preserva \n newlines con whitespace-pre-wrap o split).
  - DEPLOY `src/app/[locale]/deploy/page.tsx`: 3 cards in riga (Laptop badge recommended, VPS Caddy+Basic Auth, Serverless Vercel/Fly). Ogni card 3 step pre/code blocks con bg-muted font-mono.
  - DOCS `src/app/[locale]/docs/page.tsx`: Link tree 12 sezioni sidebar-like con 12 cards mini-guida.
  - ABOUT `src/app/[locale]/about/page.tsx`: Mission, storia, valori cards. Team 6 membri con Avatar + nome ruolo + link fake. Manifesto "We build Lead Machine because we hate SaaS subscriptions".
- **Acceptance Criteria Addressed**: AC-3, AC-5, AC-11, AC-12
- **Test Requirements**:
  - `human-judgement` TR-4.1: BYOK 6 steps corrisponde a crypto.ts (verifica leggi crypto.ts). Code block monospace con riga flow corretto.
  - `programmatic` TR-4.2: 5 pagine esistono e compilano (build).

## [ ] Task 5: Gruppo C — Pagine Legali Complete (7 Pagine Criticissime)
- **Priority**: high (bloccante, obbligatorie)
- **Depends On**: Task 1 (per chiavi dizionario)
- **Description**:
  - PRIVACY `src/app/[locale]/privacy/page.tsx`: 10 sezioni con heading H2, body diviso in paragrafi. Leggi da legal.privacy.controller/collected/purposes/basis/retention/rights/cookies/transfer/authority/changes. Tutti i body multi-linea con \n → sostituire con <p> multipli o whitespace-pre-wrap.
  - TERMS `src/app/[locale]/terms/page.tsx`: 10 sezioni legal.terms.* — stesso pattern.
  - COOKIES `src/app/[locale]/cookies/page.tsx`: Intro, whatAre, strictlyNecessary, TABELLA HTML 4 colonne × 3 righe (Cookie Name | Purpose | Duration | Controller) — header thead scuro, tbody alternato. Poi EXPLICITLY NOT USED lista puntata lunga con i cookies non usati.
  - REFUND `src/app/[locale]/refund/page.tsx`: Intro + 3 sezioni (14gg policy, procedure, exclusions).
  - IMPRINT `src/app/[locale]/imprint/page.tsx`: Body unico lungo con \n, masthead IT+DE (Art.7 Abs.1 TMG & D.Lgs 70/2003).
  - DPA `src/app/[locale]/dpa/page.tsx`: Intro + body lungo + button "Download PDF" (href="#", o blob con testo).
  - SECURITY `src/app/[locale]/security/page.tsx`: Intro + security policy.
  - **Regola**: TUTTE le pagine legali DEVONO usare testo dalle chiavi legal.*. Nessun hardcoded.
- **Acceptance Criteria Addressed**: AC-4, AC-12
- **Test Requirements**:
  - `human-judgement` TR-5.1: Nessuna sezione vuota o placeholder. Privacy 10 sezioni presenti. Terms 10 sezioni. Cookie tabella 3 righe + EXPLICITLY NOT lista con GA/Meta/LinkedIn/Hotjar esplicitamente menzionati.
  - `programmatic` TR-5.2: Build OK per tutte e 7.

## [ ] Task 6: Gruppo B — Pagine Secondarie (Blog con 3 posts MD, Changelog, Roadmap, Contributors, Status)
- **Priority**: medium
- **Depends On**: Task 4, Task 5
- **Description**:
  - BLOG: Crea `src/content/blog/*.md` (3 articoli: perche-creato, byok-zero-knowledge, confronto-0-vs-200) con frontmatter slug/title/date/excerpt/author. Crea utility per leggere MD. Pagine: `src/app/[locale]/blog/page.tsx` index lista cards. `src/app/[locale]/blog/[slug]/page.tsx` detail article con MD → HTML (usa react-markdown? NON installato. Regola: nessuna dipendenza nuova. Alternativa: contenuti blog direttamente nel dizionario JSON come HTML pre-formattato o array di paragrafi/titoli. O usa semplice dangerouslySetInnerHTML se scrivi HTML string nel JSON).
  - CHANGELOG `src/app/[locale]/changelog/page.tsx`: Timeline verticale sinistra. 8 entries v1.0.0 → v1.4.2. Data, versione, badge colorati Added/Changed/Fixed/Rimoss.
  - ROADMAP `src/app/[locale]/roadmap/page.tsx`: Kanban 3 colonne (Done / In Progress / Planned) ~30 items ognuno con titolo, descrizione, categoria, upvote counter statico.
  - CONTRIBUTORS `src/app/[locale]/contributors/page.tsx`: Griglia 30 avatar GitHub fake. DiceKoonAvatar con iniziali se non immagini. Stats commits, PR, LOC.
  - STATUS `src/app/[locale]/status/page.tsx`: 6 sistemi tutti Operational verde. Uptime 99.98% 90 giorni sparklines (30 div orizzontali gradienti). Incidenti: 0 ultimi 30 giorni.
- **Acceptance Criteria Addressed**: AC-5, AC-10
- **Test Requirements**:
  - `human-judgement` TR-6.1: 3 blog post completi, articoli lunghi min 300 parole. Roadmap 30 items presenti distribuiti 3 colonne. Timeline changelog visuale con linea sx.
  - `programmatic` TR-6.2: Build OK.

## [ ] Task 7: Gruppo B Forms + Waitlist + Welcome
- **Priority**: medium
- **Depends On**: Task 2 (toast), Task 6
- **Description**:
  - DEMO-REQUEST `src/app/[locale]/demo-request/page.tsx`: "use client". Form completo: Name (input required), Email (input type=email required), Company (input), Country (select con lista paesi), Message (textarea 10 rows required), Consent (checkbox required). Validazione client-side HTML5 + toast Sonner successo "Grazie! Ti contatteremo a breve." Niente submit vero — e.preventDefault().
  - PARTNERSHIP `src/app/[locale]/partnership/page.tsx`: "use client". Radio group tipo partnership (Agency, Influencer, OSS, Other). Nome, Email, Canale YT/IG follower count, Proposta textarea. Toast successo.
  - REPORT-ISSUE `src/app/[locale]/report-issue/page.tsx`: "use client". Title input, Radio Bug/Feature/Question, Steps textarea, Expected vs Actual 2 textarea, Browser+OS select, Severità radio Low/Medium/High/Critical, Screenshot upload UI (solo UI label + input type=file stilizzato, NO upload reale), Email opzionale.
  - WAITLIST `src/app/[locale]/waitlist/page.tsx`: "use client". Programma referral badge 3 amici 50% / 10 amici 100%. Input Email required + Submit. Genera referral link fittizio `https://leadmachine.dev/r/USER123`. Conteggio invites finti 3 amici + progress bar.
  - WELCOME `src/app/[locale]/welcome/page.tsx`: Onboarding 3 step visuali (1 Installa, 2 Configura, 3 Usa) con screenshots mock + pulsante Next/Prev o scroll.
- **Acceptance Criteria Addressed**: AC-5, AC-13
- **Test Requirements**:
  - `human-judgement` TR-7.1: Form validazione client-side funziona. Toast appare dopo submit con successo. Tutti i campi renderizzati correttamente.
  - `programmatic` TR-7.2: build + typecheck 0 errori.

## [ ] Task 8: Error Pages & Loading Skeletons (404, Error, Loading × 2)
- **Priority**: high (per build e UX)
- **Depends On**: Task 3 (ma può iniziare prima, componenti standalone)
- **Description**:
  - NOT FOUND `src/app/[locale]/not-found.tsx`: 404 grande gradient text. "Questa pagina è scappata alla ricerca di lead..." — Button "Torna alla Home". Skeleton divertente shimmer piccolo.
  - ERROR `src/app/[locale]/error.tsx`: "use client" — Error boundary Next.js. Accetta error + reset. Pulsante "Riprova" che chiama reset(). Illustrazione errore (emoji o SVG semplice lucide AlertTriangle gradient).
  - LOADING locale `src/app/[locale]/loading.tsx`: Skeleton navbar, hero 3 skeletons (badge, h1, subtitle, 2 buttons), features grid 6 cards skeleton.
  - GLOBAL LOADING `src/app/loading.tsx`: Versione corta di sopra.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-8.1: next build non fallisce per not-found/error/loading. error.tsx è "use client".
  - `human-judgement` TR-8.2: Skeletons shimmer gradient animazione fluida. 404 design divertente e consistente col brand.

## [ ] Task 9: Build & Typecheck Fix 0 Errori
- **Priority**: critical (bloccante)
- **Depends On**: ALL tasks 1-8 completati
- **Description**:
  - Esegui `cd website ; npm.cmd run build`
  - Esegui `cd website ; npm.cmd run typecheck` (tsc --noEmit)
  - Risolvi TUTTI gli errori uno per uno. Possibili errori comuni: chiavi dizionario mancanti in qualche lingua → aggiungi. Componenti shadcn props errate → fix. import mancanti → aggiungi. TypeScript strict → evita any. Variant button gradient non esiste → aggiungi. Toaster / toast types.
  - NON finire finché entrambi non hanno exit code 0.
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-9.1: `npm.cmd run build` stdout finale contiene "Compiled successfully" o "Route manifests" e exit code 0.
  - `programmatic` TR-9.2: `npm.cmd run typecheck` ritorna exit code 0, 0 errori nel log.

## [ ] Task 10: Repo GitHub Pubblico + Push Codice
- **Priority**: high
- **Depends On**: Task 9 (build OK prima del push)
- **Description**:
  - Usa MCP GitHub tools:
    a) `create_repository`: name="lead-machine-website", description="Marketing website for Lead Machine — open-source lead generation & CRM for freelancers. 7 languages, BYOK AES-256-GCM encryption, Apple-level UI. MIT license, €0 forever.", private=false, autoInit=false
    b) `push_files`: TUTTO website/ TRANNE node_modules, .next, .env, tests/screenshots-test (già in .gitignore). Branch=main. Commit message="feat: initial release Lead Machine marketing website · 7 langs · 32 pages · BYOK crypto". Uso MCP push_files o git CLI? Prefer MCP. Verifica che .gitignore in website includa node_modules, .next, .env*, tests/screenshots-test.
- **Acceptance Criteria Addressed**: AC-9 (in parte)
- **Test Requirements**:
  - `programmatic` TR-10.1: GitHub API restituisce successo per create_repository (201 Created). Repository pubblico visibile.
  - `programmatic` TR-10.2: Commit pushato con successo. File principali presenti nel remoto.

## [ ] Task 11: Deploy Vercel Produzione
- **Priority**: high
- **Depends On**: Task 10
- **Description**:
  - Usa `deploy_to_remote` con target `vercel` OPPURE CLI (cd website; npm i -g vercel; vercel --prod --yes).
  - Dopo deploy: verifica dominio pubblico con HTTP 200.
  - Salva URL del deploy.
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `programmatic` TR-11.1: Deploy Vercel finisce senza errori. URL pubblico ritorna 200 per /en.
  - `programmatic` TR-11.2: Sottopagine critiche (/en/pricing, /en/byok-lifetime, /en/privacy) ritornano 200 sul dominio deployato.

## [ ] Task 12: Playwright Screenshot Audit 32 Pagine
- **Priority**: medium
- **Depends On**: Task 9 (build OK) o Task 11 (deploy pubblico), o dev server 3001
- **Description**:
  - Avvia dev server: `cd website ; npm.cmd run dev` sulla porta 3001 (non-blocking).
  - Crea directory tests\screenshots-test.
  - Usa Playwright MCP o script Python Playwright per navigare TUTTE le 32 pagine (una per ogni route in ogni lingua? OPPURE 1 lingua EN è sufficiente per audit visuale, dato che le strutture sono identiche — user preference dice "32 pagine 1 screenshot per pagina" → 32 route = 1 screenshot ognuna). Salva PNG in website/tests/screenshots-test/.
  - Obiettivo: ogni screenshot ha pagina renderizzata, nessun errore visibile.
- **Acceptance Criteria Addressed**: AC-13
- **Test Requirements**:
  - `programmatic` TR-12.1: 32 file PNG in website\tests\screenshots-test\ con dimensione > 50KB ognuno.
  - `human-judgement` TR-12.2: Revisione casuale 10 screenshot: layout corretto, colori giusti, nessun "missing message", nessun errore React.
