# 🚀 Lead Machine — Piano d'azione pre-lancio

> Stato: audit completato il 07/10/2026 · Repo `AxsenXzc/lead-machine` · Sito su Vercel (progetto `website`)
> Autore: **Ahsen Kurtoski** — Idea & Vision · Sviluppo: Artificial Intelligence

---

## 1. ✅ Già fatto in questo giro

| Intervento | Stato |
|---|---|
| Rimozione pagina `/pricing` + sezione "Prezzi" dalla home, link nav/footer e sitemap (sito marketing) | ✅ Fatto |
| Titolo FAQ "FAQ Prezzi" → "Domande frequenti" in tutte le 7 lingue | ✅ Fatto |
| Rinomina **"Axsen Kurtoski" → "Ahsen Kurtoski"** (README, REELS_GUIDE, website/README) | ✅ Fatto |
| Nome aggiunto dove mancava: `LICENSE` (copyright), `package.json` e `website/package.json` (author) | ✅ Fatto |
| Fix lint sito (conflitto ESLint root/website: aggiunto `"root": true`) | ✅ Fatto |
| Verifiche: typecheck + lint (root e sito) · i18n 7/7 · build sito (162 pagine statiche) · browser test | ✅ Tutto verde |

**Invarianti rispettate** (come da scelte condivise): l'app (listino, preventivi, fatture) resta intatta; username GitHub `AxsenXzc` ed email `axsen_kurtoski@financier.com` restano invariati perché sono riferimenti funzionanti. Il brand display è stato uniformato ad **Ahsen-Studio** (come richiesto), con il credito "ideato e creato da Ahsen Kurtoski" aggiunto in footer, pagina Chi Siamo e imprint legale.

---

## 2. 📊 Audit del repository

| Voce | Risultato |
|---|---|
| Branch / commit | `main`, 17 commit · ultimo `585eaba` del 28/09/2026 (API key scopes) |
| Issue aperte | **0** |
| PR aperte | **0** |
| Release GitHub | **Nessuna** (manca il tag v1.0.0) |
| Lavoro locale non committato | `src/app/impostazioni/page.tsx` (esempi API con URL dinamico) — da decidere se committare |
| i18n **app** (`src/lib/i18n-dictionaries.ts`) | ✅ 245 chiavi × 7 lingue (it, de, fr, sl, en, es, pt) — parità 100% (`npm run i18n:check`) |
| i18n **sito** (`website/messages/*.json`) | ✅ 386 chiavi × 7 lingue — parità 100% (JSON validi) |
| QA automatico | ✅ `npm run qa` verde (typecheck, lint, i18n) |
| Build sito | ✅ `next build` OK — 162 pagine statiche, First Load JS ~87 kB |
| Documentazione | ✅ README, API.md, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, DEPLOY, REELS_GUIDE, LICENSE (MIT) |
| Sicurezza repo | ✅ `.env` e DB **non** tracciati; chiavi API hashate SHA-256; `npm run smoke:api` (31 assert) |
| CI/CD | ❌ **Nessuna cartella `.github`**: niente Actions, issue template, PR template, social preview |
| Dipendenze | ⚠️ `npm audit`: **17 vulnerabilità (1 critical, 14 high)** — vedi Fase 0 |
| Immagini README | ❌ Nessuna screenshot/GIF nel README (le PNG esistono solo in locale, ignorate da git) |

## 3. 🌐 Audit del deploy (Vercel)

| Voce | Risultato |
|---|---|
| Progetto | `website` (`prj_l2bdCdfK0rgIy2aNvnSvMqcRO2D3`) — sito marketing |
| Deployment | 4, tutti **READY** — nessun errore di build in produzione/preview |
| Produzione | ⚠️ **Fermo al commit `61bb624` (05/08/2026)**: 4 commit indietro rispetto a `main` → rifare il deploy |
| Dominio | ⚠️ Solo `website-mocha-one-59.vercel.app` — **nessun dominio personalizzato collegato**, mentre sitemap/canonical puntano a `https://leadmachine.dev` → SEO inceppata |
| App core (`src/`) | Non su Vercel: coerente con SQLite ephemeral (vedi DEPLOY.md) — prodotto self-host |
| Note build | Build verificata localmente: OK; cache Overpass lato server già gestita (`/api/overpass`) |

## 4. 🚨 Gap pre-lancio (per area)

| Area | Gap | Gravità |
|---|---|---|
| **Sicurezza** | `next@14.2.15` vulnerabile (DoS su Server Actions + info exposure, advisory critical); `nodemailer` high | 🔴 Blocca |
| **Deploy** | Produzione indietro di 4 commit; dominio custom non collegato; `NEXT_PUBLIC_SITE_URL` non impostato | 🔴 Blocca |
| **Docs** | ~~URL repo sbagliati (`github.com/lead-machine/lead-machine`)~~ → ✅ **Risolto**: tutti gli URL puntano a `github.com/AhsenKurtoski/lead-machine` (la repo è stata spostata sotto l'org `AhsenKurtoski`) | ✅ Fatto |
| **Contatti** | `security@lead-machine.dev` (README/SECURITY) vs `axsen_kurtoski@financier.com` (form): due indirizzi diversi, il primo probabilmente inesistente | 🟠 Importante |
| **UX/UI** | Footer con social placeholder (`twitter.com/leadmachine_dev`, `linkedin.com/company/leadmachine`) che probabilmente 404 | 🟠 Importante |
| **SEO** | hreflang/canonical su dominio non servito; manca Search Console + OG image verificata | 🟠 Importante |
| **Repo** | Niente CI, issue templates, CHANGELOG, release, topics, social preview | 🟠 Importante |
| **Marketing** | README senza GIF/screenshot; demo video solo nel sito | 🟠 Importante |
| **A11y/Perf** | Dichiarato WCAG 2.1 AA ma mai verificato con axe/Lighthouse su mobile | 🟡 Da verificare |
| **Codice** | WIP non committato in `impostazioni/page.tsx`; dipendenza `opencode-omniroute-auth` nel sito da verificare; chiavi i18n orfane (`nav.pricing`) | 🟡 Pulizia |

## 5. 📋 Piano d'azione prioritizzato

### 🔴 Fase 0 — Blocca il lancio (~6–8 ore)

| # | Azione | Stima |
|---|---|---|
| 0.1 | Aggiornare `next` all'ultimo 14.2.x patchato (root + `website/`), `npm audit fix` per il resto, ripetere `npm run qa` + build | 1 h |
| 0.2 | Rifare il deploy Vercel da `main` e impostare `NEXT_PUBLIC_SITE_URL` sul dominio reale | 20 min |
| 0.3 | Collegare e verificare il dominio custom (es. `leadmachine.dev`) su Vercel + inviare sitemap a Search Console | 1 h |
| 0.4 | ✅ **Fatto** — URL repo uniformati a `github.com/AhsenKurtoski/lead-machine` (README, package.json, badge, CONTRIBUTING, DEPLOY, sito, messaggi 7 lingue) | — |
| 0.5 | Unificare i contatti: decidere l'email di sicurezza ufficiale e allineare README, SECURITY.md e form | 30 min |
| 0.6 | Verificare/rimuovere i social placeholder del footer | 15 min |
| 0.7 | Committare (o scartare) il WIP di `impostazioni/page.tsx` + `npm run smoke:api` | 30 min |
| 0.8 | Creare la release **v1.0.0** su GitHub con note e screenshot | 45 min |

### 🟠 Fase 1 — Nice to have prima del lancio (~1–2 giorni)

| # | Azione | Stima |
|---|---|---|
| 1.1 | GIF 20–30 s del prodotto + 3–4 screenshot nel README (pipeline `npm run screenshots` già pronta) | 2 h |
| 1.2 | CI GitHub Actions: typecheck + lint + i18n:check + build a ogni push/PR | 2 h |
| 1.3 | Issue template, PR template, labels (`good first issue` citate già nel README), Discussions abilitate | 1 h |
| 1.4 | `CHANGELOG.md` (Keep a Changelog) + topics + description + social preview 1280×640 sul repo | 1 h |
| 1.5 | Audit a11y (axe) + Lighthouse mobile su home/demo: target ≥ 95 perf, 0 violazioni critiche | 2 h |
| 1.6 | Rimuovere/verificare `opencode-omniroute-auth`; pulire chiavi i18n orfane del sito | 1 h |
| 1.7 | Test manuale end-to-end del flusso guadagno: ricerca lead → contatto → preventivo → PDF, su 2 browser | 2 h |

### 🟢 Fase 2 — Post-lancio

- Issue "good first issue" reali: 8ª lingua (nl/pl/sv), guida Docker, guida Postgres, import CSV.
- Immagine Docker + template Coolify/CasaOS per lo self-host in un click.
- Roadmap pubblica + Discussions; changelog automatico dalle release.
- Partnership con community di freelancer (form `partnership` già pronto nel sito).

## 6. ✅ Checklist di lancio open source

**Repository**
- [ ] README con GIF hero, badge (build, license MIT, i18n 7 lang), demo linkata, quickstart in 4 comandi
- [ ] Description + topics GitHub (`lead-generation`, `crm`, `self-hosted`, `openstreetmap`, `nextjs`…)
- [ ] Social preview 1280×640 · LICENSE · SECURITY.md con email reale · CODE_OF_CONDUCT · CONTRIBUTING · CHANGELOG
- [ ] Release v1.0.0 con note + screenshot · label `good first issue` · Discussions aperte

**Prodotto**
- [ ] Demo live raggiungibile dal README (dominio custom)
- [ ] `npm install && npm run setup && npm run dev` funziona su macOS/Linux/Windows
- [ ] `npm run qa` e `npm run smoke:api` verdi in CI
- [ ] 7 lingue complete (✅ già verificato: 245/245 app, 386/386 sito)

**Lancio**
- [ ] Product Hunt: scheda, 5 screenshot + GIF, primo commento con la storia, launch tra martedì e giovedì
- [ ] Show HN: "Show HN: Open-source, self-hosted lead-gen CRM – €0/mo, 7 languages"
- [ ] Reddit: r/selfhosted, r/webdev, r/opensource, r/smallbusiness
- [ ] Dev.to + LinkedIn + X thread · Instagram/TikTok: 3 reel (script già pronto in REELS_GUIDE.md)
- [ ] AlternativeTo / SaaSHub / OpenAlternative / BetaList
- [ ] Search Console + sitemap inviata · OG image verificata su LinkedIn/X debugger

## 7. 🎯 Positioning & distribuzione

**Tagline consigliata**
> *Lead Machine — il CRM open-source per generare lead locali. €0 per sempre, i tuoi dati, le tue chiavi.*

**I 4 angoli narrativi** (in ordine di forza):
1. **Davide contro Golia** — "i freelance pagano fino a €200/mese di tool: l'ho reso tutto gratuito e open source". Già pronto in REELS_GUIDE.md.
2. **Privacy & BYOK** — SQLite locale, chiavi API crittografate nel browser, zero telemetria: posiziona contro gli SaaS "data-hungry".
3. **Storia umana** — teenager + AI che costruiscono un prodotto enterprise-grade: perfetto per HN/PH/TikTok, genera identificazione.
4. **Multilingua reale** — 7 lingue native (non solo UI: valute, date, IVA, PDF): leva per le community EU (DE, FR, SL, ES, PT).

**Distribuzione a 2 settimane**
- **Giorno 0**: GitHub release + Show HN + Reddit (r/selfhosted).
- **Giorno 1**: Product Hunt (mattino CET) + thread X/LinkedIn.
- **Giorno 2–3**: Dev.to "How a teenager + AI built a 7-language CRM" + reel IG/TikTok.
- **Giorno 4–7**: AlternativeTo/OpenAlternative, community freelancer IT (il mercato di riferimento del tool).
- **Settimana 2**: follow-up con i primi contributori, issue "good first issue", reply a ogni feedback.

**Metriche di successo a 30 giorni**: 500+ star, 10+ fork attivi, 5+ contributi esterni, demo con 1k+ visitatori, almeno 1 lingua aggiunta dalla community.
