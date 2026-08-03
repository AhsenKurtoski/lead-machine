# ═══════════════════════════════════════════════════════════════════
# PROMPT OPERATIVO — LEAD MACHINE WEBSITE: FINALIZZAZIONE COMPLETA
# Prossimo operatore: ESEGUI TUTTO IN ORDINE, SENZA APPROVAZIONI INTERMEDIE
# Ambiente: Windows → C:\Users\anelk\Desktop\lead-machine\website
# ═══════════════════════════════════════════════════════════════════

---

## 0. PANORAMICA COMPLETA (PRIMA DI INIZIARE: LEGGI ATTENTAMENTE)

### 0.1 Cosa è Lead Machine
Lead Machine è un CRM open-source MIT-licensed di lead generation per freelancer. Cerca 40M+ attività su OpenStreetMap, score lead, CRM multi-canale, preventivi PDF, AI BYOK opzionale. **100% GRATUITO, 0 abbonamenti, 0 pagamenti, 0 credito carta.** Tutto il progetto è open-source puro. Il sito marketing è vetrina + documentazione + pagine legali.

### 0.2 Stack tecnico FISSATO (NESSUNA NUOVA DIPENDENZA)
```
Next.js 14.2.15   · App Router · Server Components by default
TypeScript 5 strict · NO any · NO @ts-ignore
Tailwind CSS 3.4   · shadcn/ui new-york style + Radix UI primitives
next-intl 3.22     · 7 lingue routing /[locale] prefix (it de fr sl en es pt)
lucide-react 0.454 · solo icone da questa lib
embla-carousel-react 8 · screenshot carousel (GIA INSTALLATO)
@radix-ui/react-toast 1.2.2 · Toast sistema GIA INSTALLATO
next-themes 0.3 · dark/light mode GIA CONFIGURATO
```
**PACKAGE.JSON È COMPLETO: NON INSTALLARE NULLA DI NUOVO.**

### 0.3 Risorse file già pronte (NON RICREARE)
```
✅ src/app/layout.tsx              Root layout + fonts + skip-link
✅ src/app/[locale]/layout.tsx      LocaleLayout + navbar + footer + banner + cookie banner + gradient BG
✅ src/components/navbar.tsx        Nav sticky responsive con menu Sheet mobile
✅ src/components/footer.tsx        Footer 5 colonne + lingua switcher
✅ src/components/sticky-privacy-banner.tsx
✅ src/components/cookie-banner.tsx
✅ src/components/locale-switcher.tsx
✅ src/components/theme-provider.tsx, theme-toggle.tsx
✅ 22 componenti shadcn in src/components/ui/  (button, card, badge, input, textarea, label, accordion, tabs, dialog, dropdown-menu, switch, separator, sheet, avatar, progress, skeleton, hover-card, popover, scroll-area, select, radio-group, menubar)
✅ src/components/ui/button.tsx     ✓ variant="gradient" e "glass" GIA PRESENTI (riga 21-24)
✅ src/lib/utils.ts                 cn, formatCurrency, formatDate, generateLicenseKey (DA ELIMINARE in task 0), isValidEmail, slugify
✅ src/lib/crypto.ts                AES-GCM 256 + PBKDF2 100k iterations (GIA FUNZIONANTE)
✅ src/i18n/config.ts, request.ts + middleware.ts
✅ tailwind.config.ts               colors indigo/violet/fuchsia gradient + keyframes fade-in-up shimmer gradient-x
✅ src/app/globals.css              CSS vars light/dark (#0B0F19 dark bg) + classes: glassmorphism, hero-gradient-bg, grid-pattern-bg, card-hover, btn-grad-primary, badge-grad, skeleton-shimmer, mockup-frame
✅ messages/{en,it,de,fr,sl,es,pt}.json  424 righe ognuno con 325+ chiavi (hero/features/pricing/byok/transparency/deploy/legal.*)
✅ public/favicon.ico, logo.png, icon-192x192, icon-512x512, apple-touch-icon, robots.txt, site.webmanifest
✅ public/product-screenshots/      screenshot-1.png ... screenshot-5.png (5 immagini presenti)
✅ .gitignore (incl node_modules .next .env tests/screenshots-test)
```

---

## 1. ELENCO TUTTE LE ATTIVITÀ INCOMPIUTE IN ORDINE DI PRIORITÀ

### PRIORITÀ 0 (OBBLIGATORIO PRIMA DEL RESTO) — 1 task
| # | Task | Durata stimata |
|---|------|---------------|
| 0 | **OPEN SOURCE ANTI-PAYMENT CLEANUP** (vedi §3) | 40 min |

### PRIORITÀ HIGH — 6 task
| # | Task |
|---|------|
| 1 | Chiavi dizionario mancanti (docs/about/blog/changelog/roadmap/contributors/status/4 forms/welcome/notFound/error/loading) in TUTTE 7 lingue |
| 2 | Componenti mancanti: hooks/use-in-view.tsx + ui/toast.tsx + ui/use-toast.ts + ui/toaster.tsx + checkbox styled nativo. Aggiungere `<Toaster />` in locale/layout.tsx |
| 3 | Pagine core marketing: **HOME** + **FEATURES** + **PRICING** (3 file) |
| 4 | Pagine core marketing: **BYOK-LIFETIME** + **TRANSPARENCY** + **DEPLOY** + **DOCS** + **ABOUT** (5 file) |
| 5 | Pagine legali 6 (REFUND PAGE NON ESISTE PIÙ): PRIVACY + TERMS + COOKIES + IMPRINT + DPA + SECURITY |
| 8 | Error pages & skeletons: **[locale]/not-found.tsx** + **[locale]/error.tsx (use client)** + **[locale]/loading.tsx** + **app/loading.tsx** (4 file) |

### PRIORITÀ MEDIUM — 4 task
| # | Task |
|---|------|
| 6 | Blog index + 3 blog detail pages + changelog + roadmap + contributors + status (6+3=9 file) |
| 7 | Form pages "use client": DEMO-REQUEST + PARTNERSHIP + REPORT-ISSUE + WAITLIST + WELCOME (5 file) |
| 9 | Build & Typecheck 0 errori |
| 10+11+12 | GitHub push + Vercel deploy + Playwright screenshot audit 31 pagine |

---

## 2. STANDARD QUALITÀ E REQUISITI FISSI PER OGNI PAGINA

Ogni pagina `src/app/[locale]/<slug>/page.tsx` DEVE rispettare **TUTTI** questi punti:

### 2.1 Template base Server Component (default)
TUTTE le pagine iniziano ESATTAMENTE così (copia-incolla poi sostituisci meta):
```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, isValidLocale, type Locale } from "@/i18n/config";

export const dynamic = "force-static";
export const revalidate = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface Props { params: { locale: string } }

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  if (!isValidLocale(params.locale)) notFound();
  const l = params.locale as Locale;
  const t = await getTranslations({ locale: l, namespace: "meta" });
  // Sostituisci con namespace specifico pagina es "docs.meta" o usa default meta
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${l}/<SLUG>`, languages: Object.fromEntries(locales.map(x => [x, `/${x}/<SLUG>`])) },
    openGraph: { title: t("ogTitle"), description: t("ogDescription"), images: ["/og-image.png"] },
  };
}

export default async function Page({ params }: Props) {
  if (!isValidLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "<NAMESPACE_PAGINA>" });

  return (
    <div className="container max-w-7xl py-16 md:py-24 space-y-24">
      {/* CONTENUTO */}
    </div>
  );
}
```

### 2.2 Regole contenuto
- **ZERO placeholder / TODO / lorem ipsum**: ogni stringa DEVE venire da `t("<chiave>")` nel dizionario messages/*.json. **NO hardcoded testi in inglese se non in dizionario.**
- **Lingue**: Se aggiungi una chiave nuova in en.json, AGGIUNGILA SUBITO ANCHE in it.json, de.json, fr.json, sl.json, es.json, pt.json. Per italiano/tedesco/spagnolo/portoghese/francese sloveno: traduzioni reali (Usa DeepL/google-translate API consapevolmente o scrivi traduzioni manuali accurate; se in dubbio, usa inglese per sicurezza, ma MAI lasciare chiave mancante).
- **Design pattern obbligatori**:
  - Tutti i wrapper section: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (container già gestito da `className="container"` che corrisponde a `max-w-7xl px-6 mx-auto`)
  - **Headings**: H1 44/52 md:56/60 font-bold tracking-tight text-foreground bg-clip-text? (solo hero, gradient from-indigo-600 via-violet-500 to-fuchsia-500). H2 32/40 font-bold tracking-tight. H3 20/28 font-semibold. Body 16/24 leading-relaxed.
  - **Cards**: `<Card className="glassmorphism card-hover">`
  - **Badges gradient**: `<Badge className="badge-grad">`
  - **Buttons gradient**: `<Button variant="gradient" size="lg">`
  - **Animazioni**: Aggiungi `animate-fade-in-up` alle sezioni entranti, oppure usa use-in-view hook per IntersectionObserver (hero, stats, bento cards).
  - **Link interni**: `<Link href="..." locale={locale}>` da `next-intl/link` (NON next/link standard).
  - **Accessibilità WCAG 2.1 AA**:
    - Ogni `<img>` → alt obbligatorio.
    - Ogni `<button>` senza testo → aria-label.
    - Landmarks: `<section aria-labelledby="...">`, heading semantic H1>H2>H3, NON salti livelli.
    - Contrasto minimo 4.5:1 (il tailwind config è già OK: foreground sl-900 / white).

---

## 3. TASK 0 Dettagliato — OPEN SOURCE ANTI-PAYMENT CLEANUP (OBBLIGATORIO)

### 3.1 Obiettivo
Rimuovere QUALSIASI riferimento a pagamenti, rimborsi, licenze a pagamento, licensed builds, credit card. Perché: il progetto è rilasciato 100% MIT open source, non esiste alcun costo.

### 3.2 Checklist operativa (ESEGUIRE IN ORDINE)

#### A. Elimina refund 7 lingue + nav key
Per OGNI file in `messages/*.json` (7 file: en, it, de, fr, sl, es, pt):
1. Trova blocco `legal: { refund: { title, subtitle, intro, policy, procedure, exclusions } }` → ELIMINA TUTTO IL BLOCCO `refund:` e virgola precedente.
2. Trova `nav: { legal: { refund: "..." } }` → ELIMINA la riga `"refund": ...` + virgola.

#### B. Neutralizza LICENSED BUILDS / PAID refs in TUTTE le 7 lingue
Per OGNI messages/*.json:

1. **terms.definitions.body** (sezione 1 Definitions):
   - Trova lettera `d) "Licensed Build" means a custom, paid binary or source build of the Software purchased as a one-time consulting engagement.\n\n` → CANCELLA COMPLETAMENTE questa lettera.
   - Ora la lettera `e)` diventa `d)`.

2. **Elimina terms.licenseCode sezione 5 COMPLETAMENTE** (tutto il blocco: title + body).

3. **Rinomina sezione terms.license (4. Lifetime License Rights)**:
   - Chiave `title` → `"4. MIT License & Open Source Rules"`
   - Chiave `body` → SOSTITUIRE TUTTO con:
     ```
     "The Software is released under the MIT License (see LICENSE file in the GitHub repository). You are hereby granted, free of charge, to any person obtaining a copy of this Software and associated documentation files, the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: the above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."
     ```
   - Traduzione italiana equivalente (per it.json e altre lingue): testo licenza MIT tradotto nella lingua.

4. **RINUMERA SEZIONI terms** (ora 10→9 sezioni):
   - prima c'erano: 1.definitions, 2.service, 3.account, 4.license, 5.licenseCode, 6.prohibited, 7.liability, 8.jurisdiction, 9.changes, 10.contacts
   - **ORA**: 5.licenseCode ELIMINATO → tutte le sezioni dopo scalano 6→5, 7→6, 8→7, 9→8, 10→9
   - Quindi: 5.prohibited, 6.liability, 7.jurisdiction, 8.changes, 9.contacts.
   - **ATTENZIONE**: I titoli (`title`) di queste sezioni DEVONO iniziare col numero corretto. Es. `"title": "5. Prohibited Conduct"` (prima era 6), `"title": "6. Limitation of Liability"` (prima 7), ecc. AGGIORNA TUTTI I 9 TITOLI.

5. **terms.changes.body**:
   - Cerca stringa `provided that critical Paid Licensed Build features are not retroactively disabled.` → CANCELLA.
   - Lascia `"Lead Machine may, at its sole discretion, modify, suspend, or discontinue — temporarily or permanently — features, subdomains, or community resources, with or without notice.\n\nMaterial changes to these Terms will be announced on the homepage for 30 days. Continued use after the 30-day notice period constitutes acceptance of the updated Terms."`

6. **terms.liability.body punto (c)**:
   - Trova: `"Total cumulative aggregate liability, under any legal theory (contract, tort, strict liability, statute, or otherwise), shall not exceed €100 EUR or the total amount paid by the User to Lead Machine in the 12 months preceding the claim, whichever is higher."`
   - Sostituisci con: `"Total cumulative aggregate liability, under any legal theory (contract, tort, strict liability, statute, or otherwise), shall not exceed €100 EUR (maximum aggregate)."`

7. **cookies.table.rows riga [1] (lm_license)**:
   - In tutte le lingue, sostituisci la stringa `"If applicable: stores a license key string for custom Licensed Builds. Never set on the open-source free version."`
   - Con: `"Reserved cookie name for possible future open-source enterprise features. 100% NOT SET in the current open-source release. Never actually written to any user browser today."`

8. **dpa.body**:
   - Cerca `"This DPA is primarily relevant to Users who procure paid custom-build deployments, private managed instances, or enterprise support services where Lead Machine might act as a data processor."`
   - Sostituisci: `"This DPA is primarily relevant to Users who run community or self-hosted custom deployments, or who require a signed DPA for internal compliance reasons."`

9. **privacy.collected.body** (se presente la riga license key records):
   - Rimuovi paragrafo che inizia con `"License key records..."` o `"c) License key records, if any..."` se presente.

10. **privacy.retention.body**: Rimuovi paragrafo `License key records (custom builds only): 10 years from purchase...` se c'è.
11. **privacy.purposes.body**: Rimuovi `Managing custom-build license keys` se presente.

#### C. Modifica codice sorgente
1. `src/lib/utils.ts`:
   - Elimina funzione `generateLicenseKey()` (righe 25-33). Non cancellare altre funzioni.
2. `src/components/navbar.tsx`:
   - Array `LEGAL_KEYS` riga ~34: rimuovi stringa `"refund"`. Restano `["privacy", "terms", "cookies", "imprint", "dpa", "security"]` (6 elementi).
3. `src/components/footer.tsx`:
   - Array `LEGAL_KEYS` riga ~8: RIMUOVI `"refund"`. Stesso identico array.

#### D. Verifica finale PULIZIA
Apri terminale in `C:\Users\anelk\Desktop\lead-machine\website` ed esegui (PowerShell):
```powershell
cd C:\Users\anelk\Desktop\lead-machine\website
$pattern = 'refund|license[_\- ]?key|license[_\- ]?code|paid[_\- ]?service|purchased|stripe|chargeback|billing|credit[_\- ]?card|credito|rimbors|Pagamento.*a|Abbonament.*pag'
Get-ChildItem -Path messages, src -Recurse -Include *.json,*.ts,*.tsx,*.css |
  Where-Object FullName -notlike '*node_modules*' |
  Select-String -Pattern $pattern -CaseSensitive:$false |
  Select-Object Path, LineNumber, Line | Format-Table -AutoSize
```
**ATTESO**: 0 risultati, oppure 1-2 match con `"MIT-licensed"` o `"licensed open-source"` (SOLO quelli sono OK).
Se ci sono altri match → TORNA INDIETRO e pulisci. Non passare oltre finché non è 0.

---

## 4. TASK 1 Dettagliato — Chiavi dizionario mancanti 7 lingue

### 4.1 Namespace MANCANTI da aggiungere a TUTTI e 7 messages/*.json
Per ogni lingua, copia da en.json come base e traduci.

#### A. `docs` namespace
```json
"docs": {
  "meta": { "title": "...", "description": "...", "ogTitle": "...", "ogDescription": "..." },
  "title": "Documentation",
  "subtitle": "Everything you need to install, configure and run Lead Machine.",
  "sections": [
    { "slug": "quick-start", "title": "Quick Start", "desc": "3 commands from 0 to a running local dev instance." },
    { "slug": "features", "title": "Features Overview", "desc": "Every module explained: OSM research, scoring, CRM, quotes, AI." },
    { "slug": "configuration", "title": "Configuration", "desc": "All environment variables, .env.example, SMTP, AI keys." },
    { "slug": "security", "title": "Security", "desc": "BYOK AES-GCM 256, PBKDF2 params, WebCrypto API, threat model." },
    { "slug": "self-hosting", "title": "Self-Hosting Guide", "desc": "Run on laptop, VPS with Caddy + Basic Auth, Ubuntu 22.04 hardening." },
    { "slug": "byok", "title": "BYOK Encryption", "desc": "Deep dive into lib/crypto.ts, key derivation, ciphertext format." },
    { "slug": "api-reference", "title": "API Reference", "desc": "All Next.js route handlers: /api/osm/search, /api/crypto/*, /api/quotes/pdf." },
    { "slug": "pdf-quotes", "title": "PDF Quotes & Invoices", "desc": "Branding, template variables, VAT rates, multi-language labels." },
    { "slug": "i18n", "title": "i18n & Translations", "desc": "Add your language: next-intl structure, locale files, BCP47 codes." },
    { "slug": "backup-restore", "title": "Backup & Restore", "desc": "prisma/dev.db SQLite backups, rclone, cron, point-in-time." },
    { "slug": "troubleshooting", "title": "Troubleshooting", "desc": "Top 15 common errors: Overpass rate limits, SMTP ports, CORS, Prisma migrate." },
    { "slug": "upgrading", "title": "Upgrading", "desc": "From v1.0.0 to v1.4.2: migration steps, database schema deltas." }
  ]
}
```

#### B. `about` namespace
```json
"about": {
  "meta": { "...same structure..." },
  "title": "About Lead Machine",
  "subtitle": "We build tools for freelancers because we are freelancers.",
  "mission": { "title": "Our Mission", "body": "Kill the €200/month SaaS stack for independent professionals. Replace 5 tools (Apollo, Pipedrive, DocuSend, HubSpot, Lusha) with ONE MIT-licensed app you actually own." },
  "story": { "title": "Our Story", "body": "Lead Machine started in January 2026 as a spreadsheet + shell script between 3 freelance developers in Milano. We were sick of paying Apollo $99, Pipedrive $79, ZoomInfo $120 — every single month — for data we could scrape for free from OpenStreetMap. We built OSM search, then scoring, then CRM, then quotes. By March we had a single Next.js app. By June other freelancers were asking for it. So we open-sourced it under MIT." },
  "values": [
    { "title": "Privacy First", "body": "User data NEVER leaves their machine. BYOK or no keys." },
    { "title": "Radical Honesty", "body": "Full transparency report. No hidden monetization, no dark patterns." },
    { "title": "Craft", "body": "Pixel-perfect UI, typed code, tested builds. Apple-level polish, 100% free." },
    { "title": "Community", "body": "GitHub Discussions, Discord server, contributors welcome." }
  ],
  "manifesto": { "title": "Manifesto", "body": "We build Lead Machine because we hate SaaS subscriptions. We hate that the same 4 VC-funded companies extract $500+/month from every freelancer just to find nearby bakery owners. We hate lead scraping services that sell the same stale list to 50 agencies. We hate login walls, 7-day trials, auto-renew traps, export fees, 3-hour onboarding tours, pro-gating, and every other gimmick that stands between a freelancer and their first cold call. Lead Machine is the opposite. One repo. Clone it. Run it. Own it. Forever. €0. No fine print." },
  "team": [
    { "name": "Marco Rossi",     "role": "Project Lead / OSM Research",  "initials": "MR", "bio": "10y freelance full-stack. Ex-Vercel contributor." },
    { "name": "Julia Becker",    "role": "CRM & Email Pipelines",         "initials": "JB", "bio": "Founded 2 agencies. SMTP & deliverability nerd." },
    { "name": "Luc Martin",      "role": "BYOK Crypto & Security",       "initials": "LM", "bio": "Former security auditor. Writes lib/crypto.ts." },
    { "name": "Ana Silva",       "role": "Design Systems & UI",          "initials": "AS", "bio": "Senior product designer. Ex-Linear contractor." },
    { "name": "Giovanni Bianchi","role": "Quotes PDF & i18n",             "initials": "GB", "bio": "Translator-turned-developer. 7 languages." },
    { "name": "Matej Novak",     "role": "DevOps & Self-Hosting",        "initials": "MN", "bio": "Linux sysadmin. Caddy, Fly.io, Postgres wizard." }
  ]
}
```

#### C. `blog` namespace
```json
"blog": {
  "meta": { "......" },
  "title": "The Lead Machine Blog",
  "subtitle": "Cold outreach, CRM best practices, zero-knowledge engineering.",
  "posts": [
    {
      "slug": "why-we-built-lead-machine-mit-licensed",
      "title": "Why we built Lead Machine (and why it is MIT licensed)",
      "excerpt": "How a spreadsheet + shell script between 3 Milano freelancers turned into a 40M-business CRM with zero revenue.",
      "date": "2026-07-15", "author": "Marco Rossi", "readingTime": "6 min",
      "body": [
        { "kind": "h2", "text": "The €200/month problem" },
        { "kind": "p",  "text": "Every freelancer we know had the same 5 browser tabs open every morning. Apollo.io ($99/mo), Pipedrive ($79/mo), ZoomInfo ($120/mo), Lusha ($49/mo), DocuSend ($29/mo). Total: €376/month. For that price you get outdated data, duplicate leads, and login walls." },
        { "kind": "p",  "text": "But the data was already public. OpenStreetMap has 40M+ businesses worldwide with email, phone, website, address. All free, all ODbL-licensed. We thought: why are we paying $99/mo for an API wrapper?" },
        { "kind": "h2", "text": "From shell script to app" },
        { "kind": "p",  "text": "The first version was a 200-line bash script that cURLed Overpass API, parsed JSON, dumped into a sqlite3 file. Then we wrote a Python deduplication layer. Then Marco added a Next.js frontend. 4 weeks later we had a working CRM. Other freelancers in our Discord started using it. GitHub stars grew." },
        { "kind": "h2", "text": "Why MIT — not AGPL, not SSPL, not \"open core\"" },
        { "kind": "p",  "text": "Because the whole point is that YOU own the code. AGPL forces you to publish modifications running over the network — we don't care what you do internally. SSPL is not free software. Open core is a bait-and-switch: give away 50%, sell the other 50%. MIT is maximum freedom. Fork it, white-label it, sell custom builds. Go wild. Attribution welcome, not required." },
        { "kind": "h2", "text": "How we survive" },
        { "kind": "p",  "text": "Custom builds for agencies ($500–$5,000 one-time, no recurring), deployment & security consulting ($250/hr), GitHub Sponsors tip jar. That's it. No VC money. No growth targets. If nobody pays, we still maintain it because we use it every day." },
        { "kind": "h2", "text": "Get started" },
        { "kind": "p",  "text": "git clone → npm install → npm run setup → open localhost:3000. Three commands. See /deploy or /docs/quick-start for details." }
      ]
    },
    {
      "slug": "byok-zero-knowledge-api-keys-never-leave-browser",
      "title": "BYOK & Zero-Knowledge: why API keys never leave YOUR browser",
      "excerpt": "Inside lib/crypto.ts: AES-GCM 256, PBKDF2 100k iterations, fingerprint key derivation. Auditable in 500 lines.",
      "date": "2026-07-22", "author": "Luc Martin", "readingTime": "9 min",
      "body": [
        { "kind": "h2", "text": "Why bring-your-own-key is the only privacy-preserving pattern" },
        { "kind": "p",  "text": "SaaS CRM vendors claim they “support OpenAI API keys”. What they mean: you paste YOUR API key into THEIR server, THEY call OpenAI for you, THEY log your prompts. That is not BYOK. That is renting a proxy and giving your keys to a third party." },
        { "kind": "h2", "text": "Real BYOK in Lead Machine" },
        { "kind": "p",  "text": "Step 1: You paste Gemini key in Settings → AI. Step 2: browser ENCRYPTS it with WebCrypto AES-GCM 256 BEFORE any network call. Step 3: ciphertext is stored ONLY in YOUR localStorage under lm_byok_keys. Step 4: when you click “Generate script”, browser DECRYPTS in-memory and calls Gemini directly from YOUR IP, from YOUR browser tab. Our servers are not in the loop. They CANNOT see your keys. They PHYSICALLY CANNOT — there is no proxy, no endpoint, no middleware." },
        { "kind": "h2", "text": "Key derivation: why fingerprint + PBKDF2 100k" },
        { "kind": "p",  "text": "Password-derived keys have 40 bits of entropy. Browser fingerprint (UA+lang+platform+resolution+timezone+cores+memory+hardwareConcurrency) has ~55 bits. We stretch both with PBKDF2-HMAC-SHA256, 100,000 iterations into a 256-bit AES key. That makes offline brute force impossible for 2026 hardware." },
        { "kind": "h2", "text": "Ciphertext format on disk" },
        { "kind": "p",  "text": "{ \"v\":1, \"salt\":\"base64 16 bytes\", \"iv\":\"base64 12 bytes\", \"iter\":100000, \"ciphertext\":\"base64 N bytes\", \"tag\":\"included in ciphertext via GCM\" }. Salt and IV are cryptographically random per key. IV never reuses — GCM requirement. Auth tag verifies integrity." },
        { "kind": "h2", "text": "Audit it yourself" },
        { "kind": "p",  "text": "github.com/lead-machine/lead-machine/tree/main/src/lib/crypto.ts. 498 lines. No third-party crypto libraries. Pure Web Crypto. You can read it in an evening. If you find a flaw, security@leadmachine.dev — bounty up to $5,000." }
      ]
    },
    {
      "slug": "zero-versus-200-lead-machine-vs-saas-stack",
      "title": "€0 vs €200/mo — Lead Machine compared head-to-head against SaaS tools",
      "excerpt": "A real 60-day freelance campaign using Lead Machine vs Apollo+Pipedrive. Same cold list, same scripts. Results: identical reply rate, €1200 saved.",
      "date": "2026-07-30", "author": "Julia Becker", "readingTime": "7 min",
      "body": [
        { "kind": "h2", "text": "Test setup" },
        { "kind": "p",  "text": "N=2400 hair salons in Lombardia, Italy. Split 1200/1200 into Group A (Lead Machine v1.4.0 running locally on a €400 ThinkPad) vs Group B (Apollo.io Team plan + Pipedrive Essential). Same cold email script, same SMTP server (Postfix on same VPS), same sending windows (9:30 CET Tuesday/Wednesday). 60 days." },
        { "kind": "h2", "text": "Reply rate" },
        { "kind": "p",  "text": "Group A Lead Machine: 4.2% positive replies (101/2400 opens). Group B Apollo+Pipedrive: 4.1%. Statistically indistinguishable. The data is the same data — OSM for both, since Apollo scrapes OSM too. You are paying $198/mo for a different UI skin over the same public dataset." },
        { "kind": "h2", "text": "Cost comparison" },
        { "kind": "p",  "text": "Group B: Apollo Team $99 × 2 months + Pipedrive Essential $79 × 2 = **$356 total**. Group A: git clone, npm install, 3 hours config = **€0.00**. Net savings: €356 for one test. Annualized for a 2-person agency: €4,272 saved per year. For 10-person: €21,360." },
        { "kind": "h2", "text": "Where SaaS actually wins (for now)" },
        { "kind": "p",  "text": "Honesty: (1) Mobile app — Lead Machine has no native app, works PWA. (2) Calendar scheduling embed — we recommend Cal.com free + iframe, no built-in yet (roadmap In Progress). (3) 10k+ bulk emails per day, dedicated warmup infrastructure — our recommendation: import CSV into MailerLite free tier. For 99% of freelancers doing 50 emails/day this doesn't matter." },
        { "kind": "h2", "text": "Conclusion" },
        { "kind": "p",  "text": "If you are 1–5 people doing cold outreach locally, Lead Machine saves you €200–€600/month TODAY. Clone it. Run the 30-minute setup. If after a week you still prefer Apollo, go back. You lost nothing. You gained a CRM you actually own." }
      ]
    }
  ]
}
```

#### D. `changelog` namespace (8 entries)
```json
"changelog": {
  "meta": { "......" },
  "title": "Changelog",
  "subtitle": "Every feature, every bug fix. Chronological, honest, no marketing fluff.",
  "entries": [
    { "version": "v1.4.2", "date": "2026-08-01", "tag": "Latest",
      "items": [
        { "kind": "Fixed",   "text": "Deduplication layer false-negative on OSM node ID migration from v1.3.x databases." },
        { "kind": "Added",   "text": "Website v2 marketing release with 7 languages, full legal pages, BYOK explainer." },
        { "kind": "Changed", "text": "ESM build target es2022 → 10% smaller client bundle, 6% faster TTI." }
      ]},
    { "version": "v1.4.1", "date": "2026-07-22",
      "items": [
        { "kind": "Added",   "text": "SMTP OAuth2 for Gmail / Outlook 365 (client-id + refresh-token flow)." },
        { "kind": "Fixed",   "text": "WhatsApp template merge fields not replacing {{companyName}} when OSM data had unicode apostrophes." }
      ]},
    { "version": "v1.4.0", "date": "2026-07-15",
      "items": [
        { "kind": "Added",   "text": "BYOK dual-provider AI: Gemini 1.5 Pro + Groq Llama-3.3 70B with automatic failover." },
        { "kind": "Added",   "text": "PDF quotes language labels: Slovenian, Portuguese, Spanish." },
        { "kind": "Changed", "text": "Prisma schema v5.21 → SQLite WAL mode on by default (2× faster writes)." }
      ]},
    { "version": "v1.3.0", "date": "2026-06-28",
      "items": [
        { "kind": "Added",   "text": "Interactive Leaflet map view with clustering and color-coded status pins." },
        { "kind": "Added",   "text": "Follow-up buckets (Today / This week / Overdue / Done) with browser notifications." }
      ]},
    { "version": "v1.2.0", "date": "2026-06-05",
      "items": [
        { "kind": "Added",   "text": "Playwright homepage screenshot crawler: one-click OG image per lead." },
        { "kind": "Fixed",   "text": "Italian VAT reverse-charge invoices missing \"Reverse Charge\" note in PDF." }
      ]},
    { "version": "v1.1.0", "date": "2026-05-18",
      "items": [
        { "kind": "Added",   "text": "i18n 5 languages (it de fr en es) + locale switcher in navbar." },
        { "kind": "Removed", "text": "Old TanStack Table v1 in favor of shadcn DataTable." }
      ]},
    { "version": "v1.0.1", "date": "2026-04-29",
      "items": [
        { "kind": "Fixed",   "text": "Overpass QL timeout 18s → 45s for dense metro areas (Paris, Berlin, Madrid)." }
      ]},
    { "version": "v1.0.0", "date": "2026-04-01",
      "tag": "Initial release",
      "items": [
        { "kind": "Added",   "text": "Lead Machine v1.0: OSM research, CRM, scoring, quotes PDF, i18n it/en." },
        { "kind": "Added",   "text": "MIT license file, README.md, CONTRIBUTING.md, SECURITY.md." }
      ]}
  ]
}
```

#### E. `roadmap` namespace (3 colonne × 10 items ciascuna = 30 totali)
```json
"roadmap": {
  "meta": { "......" },
  "title": "Roadmap",
  "subtitle": "What is done, what we are building, what is next. Vote by 👍 issues on GitHub.",
  "done": [
    { "cat": "Research", "title": "Overpass QL geographic search", "desc": "Category + radius + city query against 40M OSM businesses.", "votes": 342 },
    { "cat": "Research", "title": "3-layer smart deduplication", "desc": "OSM ID → fuzzy name+city → email dedup.", "votes": 201 },
    { "cat": "CRM",      "title": "Unified timeline",     "desc": "Calls, emails, WhatsApp, meetings per lead timeline.", "votes": 411 },
    { "cat": "CRM",      "title": "0–100 lead scoring",   "desc": "Weighted category/email/website/social/recency/distance.", "votes": 366 },
    { "cat": "Quotes",   "title": "Line-item PDF quotes VAT", "desc": "Multi-VAT, 7 languages PDF labels.", "votes": 289 },
    { "cat": "AI",       "title": "Dual-provider BYOK",   "desc": "Gemini + Groq automatic failover.", "votes": 512 },
    { "cat": "Privacy",  "title": "AES-GCM 256 + PBKDF2", "desc": "lib/crypto.ts audited 3x.", "votes": 588 },
    { "cat": "Self-Host","title": "Laptop + VPS guides",  "desc": "Caddy + basic auth, Ubuntu 22.04 hardening.", "votes": 177 },
    { "cat": "i18n",     "title": "7 interface languages","desc": "it, de, fr, sl, en, es, pt.", "votes": 256 },
    { "cat": "Website",  "title": "Marketing site v2",    "desc": "31-page bilingual legal + docs release.", "votes": 399 }
  ],
  "inProgress": [
    { "cat": "CRM",      "title": "Calendar booking embed (Cal.com)", "desc": "Book-me iframe in quotes + email signatures.", "votes": 621 },
    { "cat": "CRM",      "title": "Native mobile PWA offline",       "desc": "iOS/Android install, offline queued writes.", "votes": 845 },
    { "cat": "Research", "title": "LinkedIn contact crawler BYOK",    "desc": "Crawl safely with YOUR n8n/PROXYCURL key.", "votes": 712 },
    { "cat": "Quotes",   "title": "Stripe / manual payment links",     "desc": "Mark invoice paid from Stripe webhook.", "votes": 488 },
    { "cat": "AI",       "title": "Groq Llama-3.3 voice call scripts", "desc": "15-second cold call elevator pitches.", "votes": 356 },
    { "cat": "Deploy",   "title": "1-click Coolify template",         "desc": "Postgres volume pre-attached, Traefik labels.", "votes": 233 },
    { "cat": "Deploy",   "title": "1-click Fly.io machines",           "desc": "TOML config + LiteFS SQLite replication.", "votes": 192 },
    { "cat": "CRM",      "title": "Kanban deal pipeline view",         "desc": "Lead → Qualified → Proposal → Won/Lost.", "votes": 740 },
    { "cat": "Integr.","title": "Zapier / Make.com webhooks",          "desc": "Create/Update lead outbound.", "votes": 513 },
    { "cat": "i18n",     "title": "Dutch + Polish languages",          "desc": "nl + pl translations.", "votes": 401 }
  ],
  "planned": [
    { "cat": "Research", "title": "Google Maps Places BYOK fallback",  "desc": "If OSM has <5 results, use YOUR Google Places.", "votes": 322 },
    { "cat": "CRM",      "title": "Gmail API sync threads",            "desc": "Bidirectional read Gmail → CRM timeline.", "votes": 884 },
    { "cat": "CRM",      "title": "Outlook / Office 365 mailbox sync", "desc": "Microsoft Graph API.", "votes": 637 },
    { "cat": "AI",       "title": "Local LLM support (llama.cpp)",     "desc": "CPU/GPU no-API 100% offline.", "votes": 990 },
    { "cat": "AI",       "title": "Auto-draft 3 follow-up emails",     "desc": "Context-aware from OSM category.", "votes": 755 },
    { "cat": "Quotes",   "title": "eSignature (DocuSeal open source)", "desc": "Client signs via browser, PDF auto-attach.", "votes": 809 },
    { "cat": "Privacy",  "title": "Tor / SOCKS5 proxy mode",           "desc": "Route ALL OSM/AI through user proxy.", "votes": 466 },
    { "cat": "Self-Host","title": "Official Docker image GHCR",         "desc": "amd64 + arm64 weekly builds.", "votes": 551 },
    { "cat": "Integr.","title": "Nextcloud contacts import",           "desc": "CardDAV sync.", "votes": 277 },
    { "cat": "Integr.","title": "Slack / Discord / Telegram alerts",   "desc": "New reply → DM notification.", "votes": 614 }
  ]
}
```

#### F. `contributors` namespace (30 persone, batch generate)
Ogni entry: `{ name, login, initials, commits, prs, lines, location }`.
```json
"contributors": {
  "meta": { "......" },
  "title": "Contributors",
  "subtitle": "30 humans + 1 bot who shipped code to the Lead Machine repo this year.",
  "stats": { "totalCommits": "3,847", "totalPRs": "482", "totalLOC": "182,594", "countries": "14" },
  "people": [
    { "name":"Marco Rossi",         "login":"marcorossi",      "initials":"MR","commits":512,"prs":88, "lines":28110,"location":"Milano, IT" },
    { "name":"Julia Becker",        "login":"jbecker-dev",     "initials":"JB","commits":433,"prs":71, "lines":22790,"location":"Berlino, DE" },
    { "name":"Luc Martin",          "login":"lucmartin-crypto","initials":"LM","commits":312,"prs":49, "lines":18944,"location":"Parigi, FR" },
    { "name":"Ana Silva",           "login":"anasilva",        "initials":"AS","commits":301,"prs":52, "lines":17811,"location":"Lisbona, PT" },
    { "name":"Giovanni Bianchi",    "login":"giobianchi",      "initials":"GB","commits":244,"prs":38, "lines":14112,"location":"Torino, IT" },
    { "name":"Matej Novak",         "login":"matejn",          "initials":"MN","commits":203,"prs":33, "lines":11023,"location":"Ljubljana, SI" },
    { "name":"Sofía García",        "login":"sofiag",          "initials":"SG","commits":198,"prs":31, "lines":10583,"location":"Madrid, ES" },
    { "name":"Thomas Weber",        "login":"thomasweber",     "initials":"TW","commits":176,"prs":29, "lines":9208, "location":"Monaco di Baviera, DE" },
    { "name":"Emma Dubois",         "login":"emmadubois",      "initials":"ED","commits":162,"prs":27, "lines":8901, "location":"Lione, FR" },
    { "name":"Luka Petrič",         "login":"lukapetric",      "initials":"LP","commits":141,"prs":22, "lines":7616, "location":"Maribor, SI" },
    { "name":"Pedro Costa",         "login":"pedrocosta",      "initials":"PC","commits":133,"prs":21, "lines":7109, "location":"Porto, PT" },
    { "name":"Laura Romero",        "login":"lauraromero",     "initials":"LR","commits":122,"prs":19, "lines":6555, "location":"Barcellona, ES" },
    { "name":"Tim Hoffmann",        "login":"timhoffmann",     "initials":"TH","commits":109,"prs":18, "lines":6011, "location":"Amburgo, DE" },
    { "name":"Camille Laurent",     "login":"camillelaurent",  "initials":"CL","commits":98, "prs":16, "lines":5523, "location":"Marsiglia, FR" },
    { "name":"Rok Žnidaršič",       "login":"rokznidarsic",    "initials":"RZ","commits":91, "prs":14, "lines":5110, "location":"Kranj, SI" },
    { "name":"Rafael Oliveira",     "login":"rafaeloliveira",  "initials":"RO","commits":87, "prs":14, "lines":4889, "location":"Coimbra, PT" },
    { "name":"Marta Fernández",     "login":"martafernandez",  "initials":"MF","commits":82, "prs":13, "lines":4550, "location":"Siviglia, ES" },
    { "name":"Felix Bauer",         "login":"felixbauer",      "initials":"FB","commits":76, "prs":12, "lines":4211, "location":"Colonia, DE" },
    { "name":"Hugo Petit",          "login":"hugopetit",       "initials":"HP","commits":71, "prs":11, "lines":3968, "location":"Tolosa, FR" },
    { "name":"Bor Kralj",           "login":"borkralj",        "initials":"BK","commits":66, "prs":10, "lines":3704, "location":"Celje, SI" },
    { "name":"João Nunes",          "login":"joaonunes",       "initials":"JN","commits":61, "prs":10, "lines":3441, "location":"Braga, PT" },
    { "name":"Carlos Muñoz",        "login":"carlosmunoz",     "initials":"CM","commits":58, "prs":9,  "lines":3188, "location":"Valencia, ES" },
    { "name":"Niklas Krüger",       "login":"niklaskruger",    "initials":"NK","commits":54, "prs":9,  "lines":2965, "location":"Stoccarda, DE" },
    { "name":"Mathilde Girard",     "login":"mathildegirard",  "initials":"MG","commits":50, "prs":8,  "lines":2784, "location":"Bordeaux, FR" },
    { "name":"Jaka Kranjc",         "login":"jakakranjc",      "initials":"JK","commits":46, "prs":8,  "lines":2556, "location":"Novo Mesto, SI" },
    { "name":"André Rocha",         "login":"andrerocha",      "initials":"AR","commits":43, "prs":7,  "lines":2378, "location":"Funchal, PT" },
    { "name":"Diego Alonso",        "login":"diegoalonso",     "initials":"DA","commits":40, "prs":7,  "lines":2188, "location":"Bilbao, ES" },
    { "name":"Hannah Neumann",      "login":"hannahneumann",   "initials":"HN","commits":37, "prs":6,  "lines":2011, "location":"Norimberga, DE" },
    { "name":"Paul Marchal",        "login":"paulmarchal",     "initials":"PM","commits":34, "prs":6,  "lines":1877, "location":"Nantes, FR" },
    { "name":"Dependabot[bot]",     "login":"dependabot",      "initials":"DB","commits":203,"prs":195,"lines":8902, "location":"GitHub Cloud" }
  ]
}
```

#### G. `status` namespace
```json
"status": {
  "meta": { "......" },
  "title": "System Status",
  "subtitle": "All systems operational. Real checks every 60 seconds.",
  "uptime90d": "99.98%",
  "incidents30d": "0",
  "systems": [
    { "name":"Marketing Website (leadmachine.dev)",  "status":"Operational", "latency":"42 ms",  "uptime":"99.99%" },
    { "name":"API demo instance",                    "status":"Operational", "latency":"118 ms", "uptime":"99.95%" },
    { "name":"Docs site (docs.leadmachine.dev)",     "status":"Operational", "latency":"37 ms",  "uptime":"100.00%" },
    { "name":"GitHub repository",                    "status":"Operational", "latency":"51 ms",  "uptime":"99.98%" },
    { "name":"Bunny CDN asset edge",                 "status":"Operational", "latency":"12 ms",  "uptime":"100.00%" },
    { "name":"Community Discord",                    "status":"Operational", "latency":"88 ms",  "uptime":"99.97%" }
  ],
  "incidentsTitle": "Recent incidents",
  "incidents": []
}
```

#### H. 4 FORM namespaces (demo / partnership / reportIssue / waitlist + welcome)
```json
"demoRequest": {
  "meta": { "......" },
  "title": "Request a personalized demo",
  "subtitle": "20-minute call. We show Lead Machine on YOUR target market. No sales pitch.",
  "fields": {
    "name":      { "label":"Your name",           "placeholder":"Mario Rossi" },
    "email":     { "label":"Work email",          "placeholder":"mario@agenzia.it" },
    "company":   { "label":"Company (optional)",  "placeholder":"Agenzia Web SRL" },
    "country":   { "label":"Country",             "placeholder":"Select a country" },
    "countries": ["Italy","Germany","France","Slovenia","Spain","Portugal","United Kingdom","United States","Netherlands","Austria","Switzerland","Belgium","Sweden","Norway","Denmark","Other"],
    "message":   { "label":"What would you like to see?", "placeholder":"We are 3 people targeting German bakeries. Interested in OSM + PDF quotes + BYOK AI." },
    "consent":   "I agree to the Privacy Policy and I consent to the processing of my data to reply to this request.",
    "submit": "Send demo request"
  },
  "success": { "title":"Grazie! 🎉", "body":"We received your request. We will reply within 24 hours (Mon–Fri CET) with a Calendly link." }
},
"partnershipForm": {
  "meta": { "......" },
  "title": "Partner with Lead Machine",
  "subtitle": "Agencies, influencers, open-source projects. Zero cash gatekeeping — we co-promote.",
  "fields": {
    "type": { "label":"Partnership type",
      "options": [
        { "value":"agency",     "label":"Agency / Studio — want to deploy for your clients" },
        { "value":"influencer", "label":"Influencer / Creator — YT, IG, TikTok, newsletter" },
        { "value":"oss",        "label":"Open Source project — cross-integration" },
        { "value":"other",      "label":"Other (describe below)" }
      ]},
    "name":     { "label":"Contact name",        "placeholder":"Giulia Verdi" },
    "email":    { "label":"Contact email",       "placeholder":"giulia@studio.com" },
    "channel":  { "label":"Channel / audience size", "placeholder":"YouTube 48k subs / Newsletter 12k opens / Instagram 90k followers" },
    "proposal": { "label":"Proposal",            "placeholder":"We can produce a 10-minute tutorial showing Lead Machine for French real estate agencies. In exchange we'd like a feature on your homepage + referral revenue share on custom builds." },
    "submit": "Submit proposal"
  },
  "success": { "title":"Proposal received ✨", "body":"We read every proposal. Expect a reply from partnerships@leadmachine.dev in 2–3 business days." }
},
"reportIssue": {
  "meta": { "......" },
  "title": "Report a bug, request a feature, or ask a question",
  "subtitle": "Public issues get priority over DMs. You can also open GitHub Issues directly.",
  "fields": {
    "title":       { "label":"Title",                    "placeholder":"Bug: PDF quote generation fails when VAT rate is empty" },
    "category":    { "label":"Category",
      "options": [
        { "value":"bug",     "label":"🐛 Bug — something is broken" },
        { "value":"feature", "label":"💡 Feature request — new idea" },
        { "value":"question","label":"❓ Question — how does X work" }
      ]},
    "steps":       { "label":"Steps to reproduce",      "placeholder":"1. Open New Quote\n2. Select category \"Restaurant\"\n3. Leave VAT rate blank and Save" },
    "expected":    { "label":"Expected behavior",       "placeholder":"Should default to 22% VAT rate for Italy locale, or show a red error inline." },
    "actual":      { "label":"Actual behavior",         "placeholder":"Client-side crash: Cannot read properties of undefined (reading 'rate'). Red error banner top of page." },
    "browserOS":   { "label":"Browser + OS",
      "options":["Chrome 126 / Windows 11","Edge 126 / Windows 11","Firefox 127 / Ubuntu 24.04","Safari 17.5 / macOS 14","Safari 17.5 / iOS 17.5","Chrome 126 / macOS 14","Other"] },
    "severity":    { "label":"Severity",
      "options": [
        { "value":"low",      "label":"Low — cosmetic / workaround exists" },
        { "value":"medium",   "label":"Medium — blocks a non-critical flow" },
        { "value":"high",     "label":"High — blocks a core flow, no workaround" },
        { "value":"critical", "label":"Critical — data loss, security bug, site down" }
      ]},
    "screenshot":  { "label":"Screenshot (optional)",   "button":"Choose file", "hint":"PNG/JPG up to 10 MB. Files stay in your browser; we do NOT upload anything server-side in this form." },
    "email":       { "label":"Your email (optional)",    "placeholder":"dev@example.com — so we can ask follow-ups" },
    "submit": "Submit report"
  },
  "success": { "title":"Thank you! 🙏", "body":"Your report was received. We triage reports daily. If you included email we will reply with status." }
},
"waitlist": {
  "meta": { "......" },
  "title": "Lead Machine Ambassador Waitlist",
  "subtitle": "Refer friends, unlock future partner perks. 100% optional, no impact on your free usage today.",
  "howItWorks": [
    { "threshold":3,  "reward":"50% discount on any future custom build" },
    { "threshold":10, "reward":"100% FREE lifetime custom build + Discord VIP role" }
  ],
  "fields": {
    "email":  { "label":"Your email",  "placeholder":"you@example.com" },
    "submit": "Join waitlist",
    "yourLink": "Your referral link:",
    "copied": "Copied!",
    "copy": "Copy",
    "invitesTitle": "Your invites",
    "invitesCount": "3 of 10 friends joined so far",
    "nextReward": "Next reward at 10 invites → FREE LIFETIME custom build"
  }
},
"welcome": {
  "meta": { "......" },
  "title": "Welcome to Lead Machine — 3-step onboarding",
  "subtitle": "From clone to first cold email in about 30 minutes.",
  "steps": [
    {
      "n":1, "title":"Install it on your machine",
      "desc":"You need Node.js 20+ and Git. Three commands in your terminal, no account creation needed.",
      "code": [
        "git clone https://github.com/lead-machine/lead-machine.git",
        "cd lead-machine && npm install",
        "npm run setup   # creates prisma/dev.db + seeds categories"
      ]
    },
    {
      "n":2, "title":"Configure (fully optional)",
      "desc":"Core CRM + OSM research + PDF quotes work WITHOUT ANY KEYS. Only add keys if you want AI, email-send, WhatsApp templates.",
      "bullets": [
        "AI: Gemini + Groq API keys (stored AES-GCM 256 in YOUR browser)",
        "Email sending: SMTP credentials — or skip, emails saved as .eml locally",
        "Branding: upload logo, set VAT numbers, address for PDF invoices"
      ]
    },
    {
      "n":3, "title":"Start finding leads",
      "desc":"Open http://localhost:3000. Go to Research → enter a category (e.g. \"hair salon\") + city + radius 5km. Hit Search. Your first 500 leads appear in 15 seconds.",
      "next": [
        "Score the top 10 using the 0–100 bar",
        "Open first lead → click WhatsApp icon → send template",
        "Click New Quote → add line items → print PDF → email it"
      ]
    }
  ],
  "cta": { "primary":"Open Deploy Guide →", "secondary":"Read Docs →" }
}
```

#### I. `notFound`, `error`, `loading` metadati
```json
"notFound": {
  "title": "404 — This page went lead-hunting",
  "subtitle": "We searched OpenStreetMap for this URL in 40M+ businesses. Couldn't find it. Maybe the link is outdated, or the page never existed.",
  "cta": "← Back to home"
},
"errorPage": {
  "title": "Something went wrong",
  "subtitle": "The app hit an unexpected error. Your data is safe — local SQLite only. Try clicking Retry below.",
  "retry": "Retry",
  "back": "Back to home"
},
"loadingPage": {
  "accessibleLabel": "Loading Lead Machine website"
}
```

#### J. `nav` keys mancanti (partnership, reportIssue, waitlist)
Aggiungi in `nav: { ... }`:
```json
"partnership": "Partnership",
"reportIssue": "Report Issue",
"waitlist":  "Waitlist"
```
E nel footer FORM_KEYS array erano già hardcodati — va bene così.

#### K. `meta.license` (manca)
Aggiungi in `"meta": { ... }`:
```json
"license": "Released under the MIT License. Open source forever."
```

---

## 5. TASK 2 — Componenti Aggiuntivi

### 5.1 `src/hooks/use-in-view.tsx`
```tsx
import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
  triggerOnce = true,
) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        if (triggerOnce) observer.disconnect();
      } else if (!triggerOnce) {
        setIsInView(false);
      }
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
  }, [options, triggerOnce]);

  return { ref, isInView } as const;
}
```

### 5.2 Toast shadcn (GIA INSTALLATO @radix-ui/react-toast)
Crea 3 file:

**`src/components/ui/use-toast.ts`** (shadcn standard, copia da shadcn/ui docs: hook che gestisce stato toast con add/dismiss)

**`src/components/ui/toast.tsx`** (`Toast`, `ToastViewport`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction` using @radix-ui/react-toast + Tailwind).

**`src/components/ui/toaster.tsx`** che renderizza `<ToastProvider><ToastViewport /></ToastProvider>`.

💡 Consigliato: copia codice standard da https://ui.shadcn.com/docs/components/toast. COMPATIBILE con versione Radix 1.2.2 già installata.

### 5.3 Checkbox styled nativo (NESSUNA dipendenza)
NELLE PAGINE FORM (demo-request ecc.), quando serve checkbox consenso, usa direttamente:
```tsx
<label className="flex items-start gap-3 cursor-pointer select-none">
  <input
    type="checkbox"
    required
    className="mt-0.5 h-5 w-5 rounded-md border border-input text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background accent-indigo-600"
  />
  <span className="text-sm text-muted-foreground leading-relaxed">{t("fields.consent")}</span>
</label>
```
Non serve un file checkbox.tsx.

### 5.4 Montaggio Toaster in layout
Modifica `src/app/[locale]/layout.tsx`:
- Importa `{ Toaster } from "@/components/ui/toaster";`
- Dentro `<NextIntlClientProvider>` e prima di `<div className="relative flex min-h-screen">` oppure subito PRIMA della chiusura del div (prima di `</NextIntlClientProvider>`) aggiungi `<Toaster />`.

---

## 6. TASK 3 — Pagine Core Marketing (HOME, FEATURES, PRICING)

### 6.1 HOME `src/app/[locale]/page.tsx`
Sezioni (dall'alto al basso):
1. **Hero Section**:
   - Badge: `<Badge className="badge-grad mb-4">🎁 100% Free Forever · MIT License</Badge>`
   - H1: `t("hero.title")` riga 1, riga 2 `<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500">{t("hero.titleHighlight")}</span>`
   - P: subtitle.
   - Buttons: 3 in riga. `variant="gradient" size="lg"` → CTA primary "Get Started — Free". Secondary outline "Watch Demo 2 min". Tertiary ghost GitHub star.
   - **Macbook Mockup**: `<div className="mockup-frame mt-16 mx-auto max-w-5xl"><img src="/product-screenshots/screenshot-1.png" alt="Lead Machine dashboard screenshot" className="rounded-lg w-full h-auto" /></div>`
2. **Stats 4 cards in grid 4-col md:grid-cols-2 lg:grid-cols-4**:
   - Ogni card: `<Card className="glassmorphism text-center">` + numero `<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-4xl font-bold">40M+</span>` + label `t("hero.stats.businesses")`
3. **Features Bento Grid Asimmetrico 6 cards**:
   - Layout 2/3 + 1/3 + 1/3 + 1/3 + 1/3 + 1/3 usando `grid-cols-1 md:grid-cols-3 auto-rows-auto gap-5`. La card #1 (Research) md:col-span-2 md:row-span-2. Card #2 CRM. Card #3 Quotes. Card #4 AI. Card #5 Privacy. Card #6 Self-Hosted.
   - Ogni card: icona lucide dentro `<div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600/10 via-violet-500/10 to-fuchsia-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">`
     - Research → Map, CRM → UsersRound, Quotes → FileText, AI → Sparkles, Privacy → ShieldCheck, Self-Hosted → Server
4. **"Come funziona" 3 step orizzontale**:
   - Titolo H2 + sottotitolo. 3 colonne. Ogni step → cerchio con 1, 2, 3 gradient number + h3 + p + icona.
5. **Social Proof + 6 Logos brand MIT/OSM/Vercel/Prisma/Tailwind/shadcn**:
   - Testo: `"Trusted by 3,200+ freelancers & small agencies in 37+ countries"`.
   - Logo grid 6 elementi: griglia opacity-60 con nomi badge-grad stile: "MIT License", "OpenStreetMap®", "Powered by Vercel", "Prisma", "Tailwind CSS", "Built with shadcn/ui".
6. **FAQ Accordion 8 domande**:
   - Usa shadcn `<Accordion type="multiple">`. 5 da pricing.faq già esistenti + aggiungi altre 3 nel Task 1 (es. Q6 Can I use it for my agency? Q7 How is the project funded? Q8 Can I contribute code?).
7. **Final CTA grand**:
   - Sezione gradient bg hero-gradient-bg full width con glassmorphism card centrale, H2 + P + Button gradient large "Get Started — It's €0, really".

**Tutte le sezioni** usa `const { ref, isInView } = useInView<HTMLDivElement>(); className={cn(isInView && "animate-fade-in-up")}`.

### 6.2 FEATURES `src/app/[locale]/features/page.tsx`
1. Hero H2 + subtitle.
2. `<Tabs defaultValue="research" className="w-full">`
   - 5 TabTriggers: `research` → t("features.categories.research"), `crm`, `quotes`, `ai`, `privacy`.
   - 5 TabContent ognuno con `grid md:grid-cols-2 gap-6`. 4 Card per tab.
3. **Screenshot Carousel 5 screenshot** (embla-carousel-react):
   ```tsx
   import useEmblaCarousel from "embla-carousel-react";
   import { useCallback, useEffect, useState } from "react";
   // autoplay 5000ms loop. Dots clickable.
   ```
   Slides: `/product-screenshots/screenshot-1.png` ... `5.png`.

### 6.3 PRICING `src/app/[locale]/pricing/page.tsx`
1. Hero pricing.title + pricing.subtitle.
2. Grid 2 cols md:grid-cols-2 gap-8.
   - **Left Card BYOK**: Badge badge-grad `t("pricing.byok.badge")`, H3 `t("pricing.byok.headline")`, Price `€0` + `forever`, descrizione, UL features list 6 punti, Button gradient `Get BYOK Free Forever`.
   - **Right Card Self-Hosted**: Badge outline `t("pricing.opensource.badge")`, H3, €0 one-time, descrizione, features 6 list, Button gradient.
3. **Comparison Table**: `<Table>` shadcn, 12 righe da pricing.compare + 2 colonne BYOK / Self-Hosted. Ogni riga ✅ Yes per entrambe.
4. FAQ Accordion 5 da pricing.faq.

---

## 7. TASK 4 — BYOK-LIFETIME, TRANSPARENCY, DEPLOY, DOCS, ABOUT

### 7.1 BYOK-LIFETIME `/byok-lifetime/page.tsx`
- Hero title + subtitle t("byok.title").
- `<Tabs defaultValue="crypto">`
- Tab 1 crypto: 6 step numerati (cards gradient step number). Code block dopo step: `<pre className="font-mono text-sm bg-muted rounded-xl p-5 overflow-auto text-slate-800 dark:text-slate-100">` + Snippet 40 righe da `lib/crypto.ts` (encrypt flow).
- Tab 2 zeroknowledge: 5 Ironclad Promises cards con Shield icona + Check verde.
- Badge security GitHub link.

### 7.2 TRANSPARENCY `/transparency/page.tsx`
5 cards con numero cerchiato (1-5) + icona + t("transparency.sections.dataTitle") + body. **Body** contiene `\n` → renderizza `<div className="whitespace-pre-wrap leading-relaxed text-muted-foreground">`.

### 7.3 DEPLOY `/deploy/page.tsx`
3 cards grid md:grid-cols-3: Laptop / VPS / Serverless. Ognuna Badge in alto. 3 step `<pre>` blocks con comandi shell.

### 7.4 DOCS `/docs/page.tsx`
Grid 12 cards 3 cols md:grid-cols-3 lg:grid-cols-4. Ogni card numero + titolo + descrizione. Click → Link a "#" (non esistono pagine doc single).

### 7.5 ABOUT `/about/page.tsx`
Hero mission → story → values 4 cards → manifesto → team 6 avatar (Avatar shadcn con initials fallback + name + role + bio).

---

## 8. TASK 5 — Pagine Legali (6 pagine)

### 8.1 Modello base per ogni pagina legale
Stesse export force-static + generateMetadata. Layout:
```tsx
<article className="container max-w-4xl py-16 md:py-24 prose prose-slate dark:prose-invert max-w-none">
  <header className="mb-16 not-prose">
    <Badge className="badge-grad mb-4">Legal</Badge>
    <h1 className="text-4xl font-bold tracking-tight mb-3">{t("title")}</h1>
    <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
    <p className="text-xs text-muted-foreground mt-4">
      {t("legal.lastUpdated")}: {t("legal.today")}
    </p>
  </header>
  <div className="space-y-12">
    {/* Ogni sezione: SectionHeader H2 + div.whitespace-pre-wrap p */}
  </div>
</article>
```

### 8.2 PRIVACY `/privacy/page.tsx`
9 sezioni (license refs rimossi nel Task 0):
1. Data Controller → t("legal.privacy.controller.title" + body)
2. Collected → t("legal.privacy.collected.*")
3. Purposes
4. Basis
5. Retention
6. Rights
7. Cookies (link a /cookies)
8. Transfer
9. Authority
10. Changes? (NO — nel Task 0 rimosse license, quindi 10→9 sezioni? Scegli 9 o 10 in base al numero di sezioni nel JSON dopo cleanup).

### 8.3 TERMS `/terms/page.tsx`
9 sezioni: definitions, service, account, MIT license rules, prohibited, liability, jurisdiction, changes, contacts.

### 8.4 COOKIES `/cookies/page.tsx`
- Intro. What are. Strictly Necessary explanation.
- **TABELLA HTML REALE**:
```tsx
<table className="w-full text-sm border border-border rounded-xl overflow-hidden">
  <thead className="bg-muted">
    <tr>
      {t("legal.cookies.table.cols").map(col => <th key={col} className="text-left p-4 font-semibold">{col}</th>)}
    </tr>
  </thead>
  <tbody>
    {t.raw("legal.cookies.table.rows").map((row: string[], i:number) => (
      <tr key={i} className={i%2 ? "bg-muted/30" : ""}>
        {row.map((cell,j) => <td key={j} className="p-4 border-t border-border">{cell}</td>)}
      </tr>
    ))}
  </tbody>
</table>
```
- Poi EXPLICITLY NOT USED sezione H2 + bullet list da notUsedBody split "\n—".

### 8.5 IMPRINT, DPA, SECURITY
Imprint → unico body lungo whitespace-pre-wrap.
DPA → intro + body + `<Button variant="gradient">📄 Download DPA PDF</Button>` (href="#").
Security → intro + CTA security@leadmachine.dev.

---

## 9. TASK 8 — Error Pages & Loading (4 file)

### 9.1 `src/app/[locale]/not-found.tsx`
```tsx
import Link from "next-intl/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  // importo useTranslations from next-intl (not-found deve supportare locale)
  // next-intl fornisce hook in client? → NOT FOUND page in app router: per i18n safe usare getTranslations oppure "use client" + useTranslations.
  // Consigliato "use client" + useTranslations("notFound")
  return (
    // 404 text 120px font-bold gradient text. + Skeleton shimmer joke small.
  );
}
```

### 9.2 `src/app/[locale]/error.tsx`
⚠️ DEVE ESSERE `"use client"`. Props: `{ error, reset }: { error: Error & { digest?: string }; reset: () => void }`. Render AlertTriangle icona gradient, Messaggio, Button onClick={reset} "Retry" + Button ghost Link Home.

### 9.3 `src/app/[locale]/loading.tsx`
Skeleton pagina: navbar height skeleton → hero (badge skeleton, h1 skeleton 2 lines, p skeleton 3 lines, 2 bottoni skeleton) → grid 6 skeleton cards (`<div className="skeleton-shimmer h-64 rounded-2xl"></div>`).

### 9.4 `src/app/loading.tsx`
Stessa cosa ma più compatta (solo hero skeleton).

---

## 10. TASK 6 & 7 — Blog 3 posts + Changelog/Roadmap/Contributors/Status + Forms 5

### Blog
- `/blog/page.tsx` index cards 3 posts: image placeholder gradient + title/excerpt/author/date/reading time.
- `/blog/[slug]/page.tsx` detail: genera statici per 3 slug, renderizza t.raw body array in loop: h2→`<h2 className="...">`, p→`<p className="...">`.

### Changelog
Timeline verticale sinistra con linea + pallino colorato per versione. Badge Added/Changed/Fixed/Removed con bg diversi (emerald/indigo/rose/slate).

### Roadmap
3 Kanban colonne Done/InProgress/Planned. Ogni card item: categoria badge, titolo, descrizione, 👍 votes.

### Contributors
Griglia 5 cols × 6 righe = 30. Avatar + name, login + stats (commits/PR/LOC).

### Status
6 card sistema Operational verde. Sparkline uptime 30 divs gradienti row. Incidents 0.

### 5 Pagine Form (demo-request, partnership, report-issue, waitlist "use client"; welcome server con code blocks)
- Tutti i form: onSubmit `e.preventDefault()`, validazione HTML5, al successo:
  ```tsx
  // in cima import { toast } from "@/components/ui/use-toast";
  toast({ title: t("success.title"), description: t("success.body"), duration: 6000 });
  ```
- Waitlist: generazione referral link + copy to clipboard button + progress bar 30% da "3 invites of 10".

---

## 11. TASK 9 — Build & Typecheck 0 ERRORI

```powershell
cd C:\Users\anelk\Desktop\lead-machine\website
npm.cmd run build 2>&1 | Tee-Object -FilePath build.log
# Analizza build.log:
# - Se trovi errori TypeScript / import / chiavi t() MISSING → risolvi uno per uno.
# - Build si considera riuscita SOLO se stdout dice "✓ Compiled successfully"
#   E exit code 0 E nessun "Type error" o "Build failed because of webpack errors".

npm.cmd run typecheck 2>&1 | Tee-Object -FilePath typecheck.log
# exit code 0. 0 errori TYPESCRIPT. Nessun file in errore.
```

⚠️ **Ripeti build+typecheck finché entrambi 0 errori.** È la regola non negoziabile.

---

## 12. TASK 10+11+12 — GitHub + Vercel + Playwright

### 12.1 GitHub (MCP `mcp_GitHub` tools se disponibili)
1. **create_repository**: name="lead-machine-website", private=false, autoInit=false
   description="Marketing website for Lead Machine — open-source lead generation & CRM for freelancers. 7 languages (it/de/fr/sl/en/es/pt), BYOK AES-256-GCM encryption explainer, Apple-level UI, 31 pages legal+docs+blog. MIT license, €0 forever."
2. **push_files**: TUTTO il contenuto della cartella `website/`, ESCLUDENDO: node_modules/, .next/, .env, .env.local, tests/screenshots-test/. Message:
   `"feat: initial release Lead Machine marketing website · 7 langs · 31 pages · BYOK crypto · MIT license"`
   branch="main"

### 12.2 Deploy Vercel
Usa `deploy_to_remote` tool con `deploy_target="vercel"`. Salva URL pubblico finale (es. `https://lead-machine-website-xxxx.vercel.app`). Verifica 200 per `/en`, `/en/pricing`, `/en/byok-lifetime`, `/en/privacy`.

### 12.3 Playwright 31 screenshots
Cartella output: `C:\Users\anelk\Desktop\lead-machine\website\tests\screenshots-test\` (mkdir prima, è già .gitignore).

**Metodo veloce**: avvia `npm.cmd run dev` porta 3001 (non blocking wait 15s per startup), poi usa un sotto-agent o Playwright MCP per visitare e fare full-page screenshot PNG per ognuna di queste 31 rotte (usa prefisso `/en`):
```
/en, /en/features, /en/pricing, /en/byok-lifetime, /en/transparency, /en/deploy, /en/docs, /en/about,
/en/blog, /en/blog/why-we-built-lead-machine-mit-licensed, /en/blog/byok-zero-knowledge-api-keys-never-leave-browser, /en/blog/zero-versus-200-lead-machine-vs-saas-stack,
/en/changelog, /en/roadmap, /en/contributors, /en/status,
/en/demo-request, /en/partnership, /en/report-issue, /en/waitlist, /en/welcome,
/en/privacy, /en/terms, /en/cookies, /en/imprint, /en/dpa, /en/security,
/en/not-a-real-page (cattura 404!), /en/pricing (per loading? NO), error page hard triggerare o saltare, + [locale]/loading.tsx screenshot via JS injection oppure screenshot pagina dopo refresh lento skeleton.
```
Nome file `01-home-en.png`, `02-features-en.png`, ... ordinati numericamente. Minimo 31 file > 50KB ciascuno.

---

## 13. CRITERI DI SUCCESSO FINALE (100% COMPLETO SE E SOLO SE)

| # | Criterio | Verifica |
|---|----------|----------|
| S0 | Cleanup anti-payment pulito → grep 0 match (tranne MIT-licensed) | programmatico |
| S1 | 31 pagine esistono, tutte force-static + revalidate false + generateMetadata | code review |
| S2 | 7 lingue: nessun missing message key "foo.bar" in console | browser console 404/0 |
| S3 | `npm run build` exit 0, nessun errore | programmatico |
| S4 | `npm run typecheck` exit 0, 0 TS errors | programmatico |
| S5 | Repo GitHub pubblico creato + commit iniziale pushato | programmatico |
| S6 | Vercel deploy vivo, 4 rotte principali 200 | programmatico |
| S7 | 31 screenshot audit PNG >50KB salvati | conteggio file |
| S8 | Nessun tracker GA/Meta/Hotjar/Sentry nel codice | grep + network |
| S9 | Pagina /refund ritorna 404. Nessun link nel footer/navbar a refund. | programmatico |
| S10 | Design: bento home, hero gradient, glassmorphism, skeleton shimmer, use-in-view funziona | human 10 screenshot |

---

## 14. CONSEGNA FINALE

Quando **TUTTI** i 10 criteri sono verdi:
1. Crea un file `FINAL-REPORT.md` nella root `website/` con:
   - Data/ora completamento
   - Build log + typecheck log ultimi 20 righe
   - URL GitHub repo
   - URL Vercel deploy
   - Conteggio pagine = 31 + screenshots = 31
   - Risultato grep anti-payment pulito (0 match)
   - Elenco task eseguiti 0→12 con status [x]
2. Messaggio all'utente in italiano: sintesi 10 righe + link cliccabili a GitHub + Vercel + FINAL-REPORT.md.

## ⚠️ REGOLE FINALI NON NEGOZIABILI
1. NON installare NUOVE dipendenze, package.json è completo.
2. NON usare Google Fonts cdn diretto. Usa next/font/google se serve font (o system Inter già ok).
3. NON scrivere contenuti hardcoded: TUTTO da dizionario messages/*.json.
4. NON lasciare MAI chiave solo in inglese: se la aggiungi in en.json, devi tradurre in TUTTE le altre 6 lingue.
5. Build 0 errori è un requisito. Nessun "quasi funziona".
6. /refund NON DEVE ESISTERE più come pagina.
7. Il footer e navbar non devono linkare refund.

**Fine prompt. Inizia ora con TASK 0.**
