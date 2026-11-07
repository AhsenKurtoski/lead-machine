# Test e verifiche

Come si controlla che Lead Machine funzioni davvero.

**Zero simulazioni.** Le verifiche di integrazione parlano con servizi reali — OpenStreetMap/Overpass, Geoapify, il geocoding di Nominatim, i record MX via DNS e le risposte HTTP dei siti — e i controlli manuali si fanno su un browser vero. Nei test unitari non c'e' nessuna rete: girano su fixture pure e su un geocoder iniettato a mano.

## Comandi rapidi

| Comando | Cosa verifica | Serve un server attivo |
|---|---|---|
| `npm run qa` | typecheck, lint, parita' delle 7 lingue, guard su contenuti e igiene e test unitari | no |
| `npm test` | solo i test unitari (`src/**/*.test.ts`) | no |
| `npm run check:hygiene` | pagine vuote, link e voci di menu verso rotte rimosse, pagine non raggiungibili, `layout` senza pagina, cartelle vuote, e residui nel database (se c'e') | no |
| `npm run check:auth` | login, cookie di sessione, CSRF, header di sicurezza e fail-closed senza `APP_PASSWORD`; avvia da solo due server di produzione | no (richiede `npm run build` e `npm run setup`) |
| `npm run smoke:api` | chiavi API, profili di permesso, scope applicati, `401/403/404`, preflight CORS | si' |
| `npm run smoke:geo` | sorgenti geografiche reali, geocoding reale senza coordinate e API pubblica di ricerca | si' |
| `npm run perf:check` | tempi di risposta reali e peso in byte delle pagine e delle API chiave | si' |
| `node scripts/probe-mirrors.mjs` | quali mirror Overpass sono ancora vivi, con quale copertura e in quanto tempo | no (va in rete) |
| `node scripts/probe-overpass.mjs` | le fonti geografiche interrogate come le interroga l'app (stesso User-Agent e stessa query), geocoder compresi | no (va in rete) |

Gli ultimi tre hanno bisogno di un server acceso:

```bash
npm run build
APP_PASSWORD='la-tua-password' PORT=3111 npm start
```

Per default puntano a `http://localhost:3111`; cambia la porta con `SMOKE_BASE`.
Gli endpoint interni sono protetti, quindi passa la stessa password del server
con `SMOKE_PASSWORD` (oppure `APP_PASSWORD`):

```bash
SMOKE_PASSWORD='la-tua-password' SMOKE_BASE=http://localhost:3111 npm run smoke:api
```

## 1. Test unitari (`npm run qa`, oppure `npm test`)

Runner: quello nativo di Node (`node:test`) con `tsx`, orchestrato da `scripts/run-tests.mjs`. Nessun framework aggiuntivo e nessun mock: se un file di test serve qualcosa dall'esterno, quella cosa viene iniettata come parametro.

| File | Cosa copre |
|---|---|
| `src/lib/verify.test.ts` | Le regole del motore di verifica: email (sintassi, domini usa-e-getta, esito quando il controllo MX non e' disponibile), telefono (lunghezza, cellulare o fisso, conferma da WhatsApp), sito (raggiungibile, lento, vecchio, assente), indirizzo e social; il riepilogo finale e il raggruppamento dei doppioni per nome + citta'. Un lead vuoto non deve inventare nulla. |
| `src/lib/search-area.test.ts` | La risoluzione dell'area di ricerca con un geocoder iniettato: coordinate esplicite, citta' della richiesta, citta' diversa da quella salvata, coordinate delle impostazioni, raggio da richiesta/impostazioni/default e — se non c'e' nulla — nessuna area e un messaggio chiaro invece di una citta' inventata. |
| `src/lib/geocode.test.ts` | Il parsing della risposta di Nominatim (latitudine, longitudine, nome esteso e provincia dal campo strutturato `county`) e di Photon (GeoJSON, coordinate invertite), con i casi limite: risposta vuota o malformata -> nessun punto, nessuna coordinata inventata. |
| `src/lib/osm.test.ts` | Il contatto e lo User-Agent mandati a OpenStreetMap: un indirizzo segnaposto (`example.com`, `esempio.it`, `test.*`, `*.local`) viene riconosciuto e **non** finisce mai nello User-Agent (e' la causa del `403 Access denied` di Nominatim), l'email reale si', e il parametro `email=` viene aggiunto una volta sola. |
| `src/lib/onboarding.test.ts` | Il primo avvio: quando serve l'onboarding (flag assente e nessuna citta'), quando non serve piu' (flag presente, anche dopo un "salta", o citta' gia' impostata) e la validazione dei campi del form. |
| `src/lib/opportunities.test.ts` | La coda delle opportunita': chi non ha un sito, chi e' contattabile, punteggio, ordinamento deterministico, filtri e statistiche. |
| `src/lib/receipts.test.ts` | Le ricevute di pagamento: metodi e valori sconosciuti, etichette, numerazione `RICEVUTA-anno-NNN`, valore per gli input data, formattazione della valuta per locale, e l'assenza di riferimenti fiscali negli helper. |
| `src/lib/auth.test.ts` | La sessione a password condivisa: soglia minima di 8 caratteri, confronto della password, token firmato valido, firma manomessa e invalidazione delle sessioni quando `APP_PASSWORD` cambia. |
| `src/lib/api-auth.test.ts` | Il minimo privilegio delle nuove API key: permessi omessi, vuoti o composti solo da spazi producono `read`; `write`, `search` e `ai` non compaiono mai senza richiesta esplicita; gli scope validi espliciti vengono conservati. |
| `src/lib/url-safety.test.ts` | La protezione SSRF: loopback, reti private, link-local, IPv6 e metadati cloud vengono rifiutati; solo URL http/https pubblici e senza credenziali passano. |
| `src/lib/csv.test.ts` | L'export CSV: neutralizzazione delle formule (`=`, `+`, `-`, `@`), quoting di virgole/virgolette/newline e parsing delle righe vuote. |
| `src/lib/contact-extract.test.ts` | L'arricchimento contatti dall'HTML reale di un sito: email da `mailto:` e dal testo, scarto di caselle automatiche e domini di esempio, profili Instagram e Facebook (scartando widget di condivisione, post singoli e pagine di login), pagina senza contatti -> nessun dato. |
| `src/lib/overpass.test.ts` | La costruzione delle query Overpass: unione delle categorie, deduplica, ordine del vincolo spaziale e normalizzazione dei numeri di telefono. |
| `src/lib/seo.test.ts` | La configurazione SEO: keywords (compreso il nome dell'autore, cercato anche senza spazio), misura di titolo e descrizione, metadata della root (Open Graph, Twitter, robots, autore), dati strutturati, URL canonico con e senza slash finali, sitemap senza percorsi vietati ai crawler, e tre guardie sul filesystem: ogni rotta pubblica ha la sua pagina, dichiara il **proprio** canonical (nella pagina, o nel layout quando la pagina e' un componente client) e la home e' un redirect HTTP in `next.config.mjs`. |

## 2. Guard rail di contenuti, traduzioni e igiene

- `npm run i18n:check` (`scripts/check-i18n.mjs`): le 7 lingue devono avere **esattamente le stesse chiavi**. Se aggiungi una stringa in `it`, aggiungila a tutte.
- `npm run check:content` (`scripts/check-content.mjs`): fallisce se rientrano identificatori del modulo commerciale rimosso o diciture fiscali (e riferimenti all'eta') nel codice, nello schema Prisma, in `README.md`, in `CONTRIBUTING.md` e nei file dentro `docs/`. L'elenco esatto delle regole e' nel commento in testa allo script. Fa parte di `npm run qa`.
- `npm run check:hygiene` (`scripts/check-hygiene.mjs`): controlla cosa **resta** quando un modulo viene rimosso o una pagina svuotata. Fallisce se trova una **pagina senza nessun elemento JSX** (un segnaposto con `return null`: Next la considera valida, quindi nessun altro controllo se ne accorge), un **link o una voce di menu verso una rotta che non esiste piu'**, una **pagina che nessuno puo' raggiungere** (ne' menu, ne' link — il residuo tipico di una funzione rimossa a meta'), un **`layout.tsx` senza `page.tsx`** o una **cartella vuota** sotto `src/`.

  Quando il database c'e' (in locale, e in CI **dopo** gli smoke test con `--require-db`) controlla anche i residui nei dati: lead e chiavi lasciati dagli smoke test, righe di verifica **orfane** o **doppie** per lo stesso campo, esiti o campi che il codice non scrive piu' (il confronto e' con `verify.ts`, non con un elenco copiato) e una coda di rinvii con tentativi fuori regola. I controlli in coda scaduti da piu' di un giorno sono un avviso (`WARN`), non un errore: sono lavoro che l'app recupera al prossimo avvio.

  Senza database la parte sui dati viene **saltata** con una riga `SKIP` (non fallita), come per `perf:check`: in CI il job `app` non ha un database e il job `smoke-api` gliene prepara uno. Le soglie vengono dai moduli veri (`verify-queue.ts`, `verify.ts`), cosi' il guard rail non puo' restare indietro rispetto alle regole del codice.

## 3. Autenticazione e sicurezza (`npm run check:auth`)

Dopo `npm run build` e `npm run setup`, lo script avvia due server di produzione su `127.0.0.1` (porte 3211 e 3212, configurabili con `AUTH_CHECK_PORT`) e verifica senza simulazioni:

1. con `APP_PASSWORD`: `/login` pubblico, API protetta senza cookie (`401`), dashboard che reindirizza al login, password errata (`401`), login corretto (`200`) con cookie `HttpOnly`, `SameSite=lax` e `Secure`, API autenticata (`200`), API v1 senza chiave (`401`), POST cross-origin (`403`), `/health` autenticata e i sei header di sicurezza;
2. senza `APP_PASSWORD`: API e dashboard (`503`) anche falsificando `Host: localhost` o `Host: example.com`, mentre `/login` e `/api/health` restano pubblici.

La password di test è generata a runtime e non viene mai stampata. I server vengono fermati anche se un controllo fallisce; lo script esce con codice diverso da zero se anche un solo controllo non torna. In CI gira nel job `app` dopo la build, con un database creato da `npm run setup`.

## 4. Smoke test delle API key (`npm run smoke:api`)

Percorso end-to-end su un server **acceso**, senza simulare nulla: crea davvero delle chiavi API con i quattro profili di permesso, controlla che ogni scope sia applicato (`200` dove consentito, `403` con lo scope richiesto dove no), che una chiave assente o inventata dia `401`, che gli id inesistenti diano `404`, che il preflight CORS risponda `204` con `allow-origin`, e infine cancella le chiavi e i lead creati per il test.

Il server deve avere `APP_PASSWORD`: lo script fa il login e usa il cookie di sessione per gli endpoint interni (`/api/keys`, `/api/leads`), mentre `/api/v1/*` continua a usare le API key. Passa la stessa password con `SMOKE_PASSWORD` (oppure con `APP_PASSWORD`, come fa il job CI):

```bash
SMOKE_PASSWORD='la-stessa-password' npm run smoke:api
```

Deve passare **tutto**: lo script esce con codice diverso da zero e stampa l'elenco dei controlli falliti se anche uno solo non torna.

## 5. Smoke test geografici (`npm run smoke:geo`)

Serve a dimostrare che le fonti geografiche funzionano sul serio, non che rispondono dei finti:

Lo script fa prima il login con `SMOKE_PASSWORD` (oppure `APP_PASSWORD`) e usa il cookie di sessione per gli endpoint interni; senza password gli endpoint protetti rispondono `401`/`503`.

1. `POST /api/ricerca` con coordinate esplicite -> arrivano candidati veri da OpenStreetMap/Overpass (e da Geoapify quando la chiave e' configurata), senza warning sulle fonti;
2. la **stessa** ricerca senza coordinate, indicando solo la citta' -> l'area viene risolta dal geocoding reale (Nominatim, con ripiego su Photon), quindi nessuna citta' e' scritta nel codice;
3. `POST /api/v1/search` con una chiave API vera -> la ricerca pubblica restituisce attivita' reali e nessuna fonte va in timeout.

I mirror pubblici di Overpass limitano le raffiche dallo stesso IP: tra una ricerca e l'altra lo script aspetta `SMOKE_PAUSE_MS` (default 20 secondi, `0` per disattivare l'attesa). Se un mirror e' momentaneamente sovraccarico puo' capitare un controllo rosso: e' un limite del servizio gratuito, non dell'app, che in quel caso risponde comunque con un warning e con i risultati dell'altra fonte.

## 6. Controllo delle performance (`npm run perf:check`)

Misura su un server acceso il tempo di risposta e i byte scaricati delle pagine e delle API piu' usate (dashboard, ricerca, CRM, coda delle opportunita', elenchi e notifiche) e fallisce se una misura supera il budget previsto: e' il controllo che tiene la promessa "l'app non deve laggare". Usa la stessa variabile `SMOKE_BASE` degli smoke e fa il login con `SMOKE_PASSWORD`/`APP_PASSWORD`; i budget si allargano solo di proposito con `PERF_BUDGET_SCALE`.

Oltre alle misure controlla quattro comportamenti che un tempo di risposta veloce non rivelerebbe:

- la home risponde con un **redirect HTTP** (`307`) a `/dashboard` e non con un `200` e un meta refresh;
- l'elenco lead **non** trasporta i campi pesanti (`demoHtml`, `demoPrompt`, `websiteScreenshot`) e contiene `id` e `name` per ogni riga (un `select` sbagliato puo' svuotare i lead senza cambiare ne' stato ne' tempi);
- la coda delle opportunita' disegna **una pagina alla volta** (max 25 attivita'), cosi' il peso non cresce con l'archivio.

I byte misurati sono quelli non compressi (quello che il browser deve analizzare); sulla rete viaggiano compressi.

## 7. Il motore di verifica fa controlli reali

Quando premi **Verifica ora** su un lead non viene simulato niente:

- email -> risoluzione **MX** reale del dominio via DNS (se il resolver non risponde il dato resta **da verificare**: un errore di rete non diventa mai un verdetto, mentre un dominio inesistente o senza record MX e' «non raggiungibile»);
- sito -> richiesta **HTTP** reale, con misura del tempo di risposta e controllo del `meta viewport` (se il server risponde con un errore, l'esito dice quale codice HTTP ha ricevuto; se invece non risponde **affatto** il dato resta **da verificare** — non sappiamo se il problema e' il sito o la nostra rete — con la spiegazione del motivo e la riprova in coda);
- citta' e indirizzi -> **geocoding** reale su Nominatim e, se non risponde, su **Photon** (entrambi OpenStreetMap, nessuna chiave);
- telefono, indirizzo e social -> regole dichiarate, con la fonte (`openstreetmap`, `controllo_diretto`, `ricerca_web`) e la spiegazione salvate accanto a ogni esito. La presenza di un numero WhatsApp o di un link social non viene trattata come conferma: senza un controllo reale il campo resta `da_verificare`.

L'arricchimento contatti (`Arricchisci contatti`) scarica la pagina del sito, estrae email e profili social pubblici e ricontrolla il sito: anche qui nessuna chiave AI e' necessaria e nessun dato viene inventato.

**Un controllo che non si e' potuto fare non e' un verdetto: si riprova.** Se il resolver DNS non risponde o il sito non da' nessuna risposta (errore di rete, tempo scaduto), il dato resta **da verificare** e il campo entra in una coda (modello `VerificationRetry`, regole pure in `src/lib/verify-queue.ts`). L'app riprova da sola: quando si apre chiede al server di processare i controlli scaduti (`POST /api/leads/verify/retry`, al massimo 5 lead per chiamata), con attese crescenti — 5 minuti, 10, 20, 40 — e un tetto di 6 ore, per un massimo di 5 tentativi. La spiegazione accanto al campo dice sempre che il controllo e' rinviato e fra quanto («Controllo non riuscito (il resolver DNS non ha risposto): lo riprovo tra 5 minuti (tentativo 2 di 5)»), quindi «da verificare» non resta mai un'etichetta senza motivo. Esauriti i tentativi il dato resta **da verificare** senza altre riprove automatiche. `GET /api/leads/verify/retry` mostra la coda con il prossimo tentativo di ogni campo.

## 8. Cosa NON e' coperto

- **Controllo visivo e mobile**: nessun test automatico di rendering. Gli screenshot si generano con `APP_PASSWORD=… npm run screenshots` e il video con `APP_PASSWORD=… npm run demo` (richiedono Playwright installato con `npm run setup:screenshot`, ffmpeg/ffprobe nel PATH e un server avviato). Il video esce a 1920×1080 con cursore, intro/outro, lower-third, dissolvenze e musica generata dal codice; la resa a occhio si verifica nel browser.
- **Invio email reale**: senza `SMTP_HOST` configurato l'app scrive i file `.eml` in `./tmp/emails/` per scelta. L'invio via SMTP non e' esercitato dai test.
- **Provider AI**: senza `GEMINI_API_KEY` o `GROQ_API_KEY` le funzioni AI rispondono `503`. Gli smoke non li interrogano (consumano quota).
- **Servizi di terze parti**: disponibilita' e limiti di Overpass, Nominatim e Geoapify non dipendono da noi. L'app degrada con un warning e con i risultati delle altre fonti; gli smoke lo tollerano.
- **Accessibilita' automatica**: non c'e' un audit axe o Lighthouse in CI: i controlli di base (skip-link, landmark, ARIA, focus visibile) sono fatti a mano.
- **Componenti React**: non ci sono test di rendering (nessun testing library): la logica e' nei moduli puri di `src/lib/` proprio per poterla testare senza browser.

## 9. Prima di una release

```bash
npm run qa                 # typecheck + lint + i18n + guard + test unitari
npm run build              # build di produzione (prisma generate + next build)
npm run setup              # DB e seed su un database nuovo, se serve

# con il server acceso su 3111:
SMOKE_PASSWORD='la-tua-password' npm run smoke:api
SMOKE_PASSWORD='la-tua-password' npm run smoke:geo
SMOKE_PASSWORD='la-tua-password' npm run perf:check
```

Poi un giro a mano nel browser sulle pagine principali (dashboard, ricerca, CRM con verifica e arricchimento, opportunita', ricevute, impostazioni, onboarding su un database vuoto).

## 10. Cosa gira in CI

`.github/workflows/ci.yml`, a ogni push e pull request:

- **job "app"**: `npm run qa` e poi `npm run build` (la parte sui dati del guard rail di igiene viene saltata: li' non c'e' un database);
- **job "smoke-api"**: costruisce il **build di produzione**, prepara database e seed, avvia `next start`, lancia `npm run smoke:api` contro quel server e poi `node --import tsx scripts/check-hygiene.mjs --require-db`, che qui **pretende** il database e verifica che gli smoke non abbiano lasciato residui (lead, chiavi, verifiche orfane o doppie);
- **job "live"** (solo schedulato o con `workflow_dispatch`): costruisce il server di produzione, prepara database e seed, avvia `next start` e lancia `npm run smoke:geo` e `npm run perf:check`. Non e' un job richiesto dalle pull request: dipende da Overpass/Nominatim e da una macchina con il server acceso, quindi un loro disservizio non deve bloccare una modifica. I budget di performance sono calibrati su `npm start`, non sul server di sviluppo. Su un database senza lead i controlli che parlano dei dati vengono saltati con una riga `SKIP`, non falliti.
- **job "audit"** (solo settimanale): `npm audit` sulle dipendenze.

`smoke:geo` e `perf:check` restano lanciabili anche in locale, con la stessa password e lo stesso `SMOKE_BASE` descritti sopra. `smoke:geo` dipende dai servizi esterni live, `perf:check` da una macchina con il server di produzione acceso.
