# AGENTS.md — istruzioni per agenti di codice

Istruzioni per chi lavora su questo repository con un agente LLM. Descrivono
ciò che è verificato oggi; i dettagli lunghi stanno in `docs/`, i comandi di
collaudo in `docs/TESTING.md`.

## Cos'è Lead Machine

Gestionale per trovare, verificare e contattare attività locali (lead) a
partire da dati geografici reali. Next.js (App Router) + TypeScript, database
SQLite in locale via Prisma e **D1** in produzione, deploy su **Cloudflare
Workers** con OpenNext. Interfaccia multilingua (7 lingue con parità
verificata), pannello CRM, mappa, calendario, ricevute, API pubbliche con
chiavi e permessi.

- Node richiesto: **>= 20.9** (`engines`); la CI usa Node 22.
- Produzione: Cloudflare Workers + D1 (vedi `wrangler.jsonc`, `docs/CLOUDFLARE-FREE.md`).

## Regole non negoziabili

1. **Zero dati inventati.** Un lead senza telefono verificato non ha un
   telefono. Le verifiche (`verifyLeadOffline`, `preserveManualVerifications`)
   devono sempre riportare **fonte e spiegazione**; un dato non verificato
   resta vuoto, non si stima.
2. **Niente numeri finti nei testi e nelle demo.** Se un valore è di esempio,
   va dichiarato come tale.
3. **Una sola verità per lo schema:** ogni modifica va scritta in
   `prisma/schema.prisma` **e** in una migrazione `migrations/*.sql`.
   `npm run check:schema` fallisce se i due divergono.
4. **Segreti mai nel repository.** Chiavi API, password e token stanno nelle
   variabili d'ambiente (locale `.env`, produzione: `wrangler secret` /
   Cloudflare). Le chiavi API degli utenti si salvano solo come hash
   (`hashApiKey` in `src/lib/api-auth.ts`), mai in chiaro.
5. **Italiano nei testi di prodotto e nei commenti**, con il motivo delle
   scelte. Le altre lingue sono dizionari, non traduzioni a runtime.

## Comandi

```bash
npm ci                 # dipendenze dal lockfile
npm run dev            # sviluppo su http://127.0.0.1:3000
npm run setup          # db locale: prisma db push + seed

npm run qa             # typecheck + lint + i18n + contenuti + igiene + schema + test
npm test               # solo test unitari (src/**/*.test.ts)
npm run check:schema   # migrazioni D1 applicate a un DB vuoto == schema Prisma
npm run check:auth     # login, cookie, CSRF, header, fail-closed senza APP_PASSWORD
npm run check:pages    # pagine e rotte raggiungibili
npm run check:content  # testi e dati coerenti
npm run check:hygiene  # pagine vuote, link morti, residui nel database
npm run check:ui       # 17 pagine in chiaro/scuro con Playwright (serve il server)
npm run smoke:api      # chiavi, permessi, 401/403/404, preflight CORS
npm run test:flows     # flussi reali sul server (dati lead, CSV, ricevute, bulk)
npm run smoke:geo      # sorgenti geografiche e geocoding reali
npm run perf:check     # tempi e byte delle pagine e API chiave

npm run build          # prisma generate + next build
npm run cf:build       # build per Cloudflare (OpenNext)
npm run cf:preview     # build + wrangler dev
npm run cf:deploy      # build + wrangler deploy
npm run cf:migrate:remote  # migrazioni D1 in produzione
npm run backup:d1      # backup del database D1
```

Prima di proporre un commit: `npm run qa` (è lo stesso comando della CI) e, se
hai toccato UI o API, i controlli che richiedono un server
(`check:auth`, `check:ui`, `smoke:api`, `test:flows`).

## Mappa del repository

```
src/app/               rotte Next.js (dashboard, crm, mappa, calendario, api/, ...)
src/components/        componenti UI
src/lib/               logica pura e servizi (verify, scoring, osm, api-auth, i18n, ...)
prisma/schema.prisma   schema del database (fonte di verità)
prisma/seed.ts         dati di sviluppo
migrations/*.sql       migrazioni D1 (devono combaciare con lo schema)
scripts/               qa, smoke, flussi, screenshot, backup, controlli
docs/                  TESTING.md, API-KEYS.md, CLOUDFLARE-FREE.md, mcp.md, ...
public/                icone e asset statici
wrangler.jsonc         configurazione Workers + binding D1 (DB)
```

## Test e dati di prova

- I test unitari non usano la rete: fixture pure e servizi iniettati.
- I controlli end-to-end parlano con servizi reali (Overpass, Geoapify,
  Nominatim, DNS MX, HTTP dei siti) — è voluto: "zero simulazioni".
- `scripts/test-flows.mjs` crea dati con il prefisso **`Flussi Test —`** e li
  elimina alla fine: se un test si interrompe, cerca e rimuovi quei residui.
- Il database locale è `prisma/dev.db` (da `npm run setup`).

## CI

`.github/workflows/ci.yml` esegue: job `app` (`npm run qa` + build), `workers`
(compatibilità Cloudflare/D1), `smoke-api` (API + flussi + UI), `docker` e i
job pianificati `live`/`audit`. Un fallimento in `qa` va risolto alla causa:
non si allentano i controlli per farlo passare.

`codeql.yml` analizza JavaScript/TypeScript su push, pull request e ogni
lunedì. Gli alert aperti hanno una decisione scritta in
[`docs/CODEQL_TRIAGE.md`](docs/CODEQL_TRIAGE.md) — corretto, falso positivo,
scelta voluta o solo test — con il punto esatto del codice. Un alert non si
dismette senza quella riga, e un alert nuovo va spiegato lì prima di chiuderlo.

## Trappole note (verificate)

- `wrangler.jsonc` contiene un `database_id` segnaposto finché non si crea il
  database D1 reale: senza, `cf:deploy` non funziona (non è un bug del codice).
- Lo schema Prisma è SQLite: gli stati sono stringhe documentate, non enum.
- La parità delle lingue è un test (`i18n:check`): una chiave aggiunta solo in
  italiano fa fallire `qa`. Aggiorna tutti i dizionari o usa `i18n:merge`.
- `check:ui` richiede Playwright con Chromium installato
  (`npm run setup:screenshot`).
- `next start` ascolta su 127.0.0.1 per scelta; per esporre in rete usare
  `npm run start:public`.

## Sicurezza: cosa non deve regredire

- Login con cookie di sessione, CSRF e header di sicurezza: coperti da
  `npm run check:auth`, che verifica anche il comportamento **fail-closed**
  quando `APP_PASSWORD` manca.
- Le API pubbliche usano chiavi con hash e scope; senza credenziali
  rispondono 401, con scope insufficiente 403. CORS ristretto.
- Rate limit sulle rotte sensibili (`rateLimit` in `src/lib/api-auth.ts`).
- Nessun token nei log, nelle risposte o nei file committati.
- `check:ui --theme=both --mobile` deve restare a **0 problemi e 0 avvisi**:
  un avviso è una cosa da guardare, non rumore. L'ultimo risolto era lo scroll
  orizzontale di `/crm` a 390 px (overflow della tabella che risaliva al
  documento: `contain: layout` sul wrapper).

## Cosa non fare

- Non inventare lead, numeri, recensioni o risultati di verifica.
- Non modificare lo schema senza la migrazione corrispondente.
- Non committare `.env`, database locali o backup.
- Non fare push diretti su `main` in un repository condiviso: branch + PR + CI
  verde.
