# Test e verifiche

Come si controlla che Lead Machine funzioni davvero.

**Zero simulazioni.** Le verifiche di integrazione parlano con servizi reali — OpenStreetMap/Overpass, Geoapify, il geocoding di Nominatim, i record MX via DNS e le risposte HTTP dei siti — e i controlli manuali si fanno su un browser vero. Nei test unitari non c'e' nessuna rete: girano su fixture pure e su un geocoder iniettato a mano.

## Comandi rapidi

| Comando | Cosa verifica | Serve un server attivo |
|---|---|---|
| `npm run qa` | typecheck, lint, parita' delle 7 lingue, guard su contenuti e igiene, allineamento D1 ↔ Prisma e test unitari | no |
| `npm test` | solo i test unitari (`src/**/*.test.ts`) | no |
| `npm run check:hygiene` | pagine vuote, link e voci di menu verso rotte rimosse, pagine non raggiungibili, `layout` senza pagina, cartelle vuote, e residui nel database (se c'e') | no |
| `npm run check:auth` | login, cookie di sessione, CSRF, header di sicurezza e fail-closed senza `APP_PASSWORD`; avvia da solo due server di produzione | no (richiede `npm run build` e `npm run setup`) |
| `npm run check:ui` | console pulita, nessun errore di idratazione, nessun 401/5xx e nessun overflow orizzontale su 19 pagine (incluse la scheda di un lead e una ricevuta), in tema chiaro e scuro e a 390x844 (Playwright) | si' |
| `npm run smoke:api` | chiavi API, profili di permesso, scope applicati, `401/403/404`, preflight CORS | si' |
| `npm run test:flows` | flussi chiave sul server vero: dati del lead e verifica, import CSV, ricevute, azioni massive | si' |
| `npm run check:ui:flows` | mutazioni dal browser: cambio stato persistito dopo il ricaricamento, dialogo di eliminazione accessibile (nome, focus, axe, Escape) e stato originale ripristinato | si' |
| `npm run check:schema` | le migrazioni D1 applicate a un database vuoto danno esattamente lo schema Prisma (fa parte di `npm run qa`) | no |
| `npm run check:backup` | esporta un D1 locale, lo reimporta in un database vuoto e verifica dati e schema ripristinati | no |
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

## 4b. Flussi chiave (`npm run test:flows`)

I percorsi che l'utente tocca ogni giorno, provati contro il server acceso con gli stessi endpoint dell'interfaccia. Non sono test unitari su funzioni pure: qui si crea, si legge, si modifica e si cancella davvero, e si controlla cosa resta nel database.

- **Dati del lead**: creazione con deduplica su `osmId` e su nome + citta, campi salvati come inviati, email non valida respinta (`400`) e non applicata, cambio di stato che lascia una riga nel diario.
- **Verifica dati**: una fotografia per campo (`phone`, `email`, `website`, `address`, `social`), zero problemi su un lead vuoto, sito assente confermato, indirizzo con coordinate lasciato `da_verificare` (nessun geocoder ha confermato la posizione), e una seconda verifica che **sostituisce** la fotografia invece di duplicare le righe. Il lead usato non ha email ne sito, quindi il test non tocca la rete ed e' deterministico anche in CI.
- **Import CSV**: 5 righe in cui 2 sono valide e 3 vanno scartate (duplicato nel file, riga senza nome, stato inesistente); voto `4.56` arrotondato a `4.6`, coordinate con la virgola (`45,07`) accettate, voto `9` e `lat` `999` scartati, punteggio `150` limitato a `100`; un secondo import non crea doppioni.
- **Ricevute**: numero `RICEVUTA-<anno>-NNN` progressivo, importo arrotondato ai centesimi, metodo sconosciuto ricondotto a `contanti`, `400` su importo non positivo o lead mancante, `404` su lead inesistente, elenco per lead in ordine di data, modifica, data non valida respinta, cancellazione effettiva.
- **Azioni massive**: cambio di stato su piu' lead con una riga di diario per ciascuno, stato/azione inesistenti respinti, id inesistenti che non sono un errore (`0` eliminati), eliminazione del lead e **cascata** sulle ricevute collegate.

```bash
SMOKE_PASSWORD='la-tua-password' npm run test:flows
```

I lead creati hanno tutti il prefisso `Flussi Test —`: lo script li cancella a fine corsa e anche all'inizio, se una run precedente si e' interrotta a meta' (il controllo di igiene in CI non trova residui).

## 4c. Allineamento D1 ↔ Prisma (`npm run check:schema`)

Il progetto ha due sorgenti di verita' per il database: `prisma/schema.prisma` per lo sviluppo locale (`prisma db push`) e `migrations/*.sql` per D1, dove il database nasce con `wrangler d1 migrations apply`. Se divergono, tutto funziona in locale e in produzione le API rispondono `no such column` solo dopo il deploy.

Il controllo applica tutte le migrazioni, in ordine, a un database SQLite temporaneo e le confronta con lo schema Prisma usando `prisma migrate diff --exit-code`: qualunque differenza di tabella, colonna, indice o vincolo fa fallire il comando e stampa l'SQL mancante. Il database temporaneo viene cancellato a fine corsa e non serve nessun servizio esterno.

Quando il controllo fallisce, la correzione e' una **nuova** migrazione (es. `migrations/0002_....sql`) con l'SQL stampato: `0001_init.sql` e' gia' stata applicata sui database esistenti e non va modificata.

Il controllo fa parte di `npm run qa`: una divergenza si vede sul computer di chi scrive il codice, alla prima esecuzione del gate, e non al primo deploy. In CI non c'e' un passo separato, lo esegue `qa`.

## 4d. Backup e ripristino D1 (`npm run check:backup`)

`npm run backup:d1` esporta il database di produzione, ma un backup che non e' mai stato ripristinato non dimostra nulla: il file potrebbe essere vuoto, incompleto o non reimportabile. Questo controllo fa il giro completo su un D1 **locale** (workerd/SQLite, nessun account Cloudflare): applica le migrazioni, inserisce una riga nota, esegue `wrangler d1 export`, importa il dump in un database vuoto e confronta la riga, il numero di righe di `Setting` e `Lead` e la presenza della tabella `RateLimit` nello schema.

Il ripristino avviene su un database vuoto di proposito: il dump contiene schema, dati e tabella `d1_migrations`, quindi importarlo sopra un database gia' migrato deve fallire (ed e' cosi' che si accorge di un ripristino fatto nel modo sbagliato). Lo stato locale vive in una cartella temporanea e viene cancellato a fine corsa: `wrangler dev` e il tuo D1 locale non vengono toccati.

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

## 7. Controllo dell'interfaccia (`npm run check:ui`)

Apre con Chromium le 19 pagine autenticate dell'app (17 fisse + la scheda di un lead + una ricevuta) su un server di **produzione** e, per ogni pagina, per ogni tema (chiaro e scuro) e per ogni viewport (1280x800 e, con `--mobile`, 390x844), fallisce se trova:

- un messaggio di **errore o warning in console**, compresi gli errori di idratazione di React;
- una **risposta API `401`, `403` o `5xx`** su una pagina gia' autenticata (e' cosi' che sono stati scoperti i due `401` sulla pagina di login);
- **overflow orizzontale** della pagina (e' cosi' che e' stata scoperta la card della dashboard che sfondava a 320 px);
- il tema richiesto **non applicato** (`<html class="light">` o `"dark"`);
- una violazione **WCAG 2.0/2.1 A e AA** trovata da `axe-core` (le gravi e critiche bloccano, le altre sono avvisi). L'audit gira su ogni pagina e in ogni tema, quindi copre anche il contrasto reale dei colori, non solo dei token.

```bash
npm run build
APP_PASSWORD='la-tua-password' PORT=3111 npm start
APP_PASSWORD='la-tua-password' npm run check:ui
```

Opzioni: `--theme=light` (un solo tema), `--mobile` (aggiunge il giro a 390x844 con gli stessi controlli: anche li' l'overflow orizzontale della pagina e' bloccante), `--contrast` (stima del contrasto del testo sotto 3:1, solo avvisi) e `--no-axe` (salta l'audit di accessibilita'). La scheda di un lead (`/crm/{id}`) e la ricevuta (`/ricevuta/{id}`) sono incluse: il lead viene dal seed o, se il database e' vuoto, da un record temporaneo; la ricevuta e' sempre temporanea (creata per quel lead). Entrambi i record vengono cancellati alla fine.

## 8. Il motore di verifica fa controlli reali

Quando premi **Verifica ora** su un lead non viene simulato niente:

- email -> risoluzione **MX** reale del dominio via DNS (se il resolver non risponde il dato resta **da verificare**: un errore di rete non diventa mai un verdetto, mentre un dominio inesistente o senza record MX e' «non raggiungibile»);
- sito -> richiesta **HTTP** reale, con misura del tempo di risposta e controllo del `meta viewport` (se il server risponde con un errore, l'esito dice quale codice HTTP ha ricevuto; se invece non risponde **affatto** il dato resta **da verificare** — non sappiamo se il problema e' il sito o la nostra rete — con la spiegazione del motivo e la riprova in coda);
- citta' e indirizzi -> **geocoding** reale su Nominatim e, se non risponde, su **Photon** (entrambi OpenStreetMap, nessuna chiave);
- telefono, indirizzo e social -> regole dichiarate, con la fonte (`openstreetmap`, `controllo_diretto`, `ricerca_web`) e la spiegazione salvate accanto a ogni esito. La presenza di un numero WhatsApp o di un link social non viene trattata come conferma: senza un controllo reale il campo resta `da_verificare`.

L'arricchimento contatti (`Arricchisci contatti`) scarica la pagina del sito, estrae email e profili social pubblici e ricontrolla il sito: anche qui nessuna chiave AI e' necessaria e nessun dato viene inventato.

**Un controllo che non si e' potuto fare non e' un verdetto: si riprova.** Se il resolver DNS non risponde o il sito non da' nessuna risposta (errore di rete, tempo scaduto), il dato resta **da verificare** e il campo entra in una coda (modello `VerificationRetry`, regole pure in `src/lib/verify-queue.ts`). L'app riprova da sola: quando si apre chiede al server di processare i controlli scaduti (`POST /api/leads/verify/retry`, al massimo 5 lead per chiamata), con attese crescenti — 5 minuti, 10, 20, 40 — e un tetto di 6 ore, per un massimo di 5 tentativi. La spiegazione accanto al campo dice sempre che il controllo e' rinviato e fra quanto («Controllo non riuscito (il resolver DNS non ha risposto): lo riprovo tra 5 minuti (tentativo 2 di 5)»), quindi «da verificare» non resta mai un'etichetta senza motivo. Esauriti i tentativi il dato resta **da verificare** senza altre riprove automatiche. `GET /api/leads/verify/retry` mostra la coda con il prossimo tentativo di ogni campo.

## 9. Cosa NON e' coperto

- **Mutazioni nel browser**: `npm run check:ui:flows` e' l'unico controllo che clicca qualcosa che scrive. Usa un lead del seed, cambia stato dalla scheda, verifica la PATCH e ricarica la pagina per assicurarsi che venga mostrato il dato persistito (non lo stato React), poi apre il dialogo di eliminazione e ne controlla nome accessibile, focus e regole axe, chiudendolo con Escape senza cancellare nulla. Lo stato originale viene ripristinato nel `finally`: un'interruzione a meta' non lascia il lead modificato. Non crea dati finti e non serve un database vuoto.

- **Resa visiva e mobile**: `npm run check:ui` intercetta errori di console, idratazione, richieste fallite e overflow, ma **non** giudica l'aspetto: colori, spaziature e leggibilita' si guardano a occhio. Con `--mobile` controlla anche 390x844, dove l'overflow orizzontale della pagina blocca come a desktop. Gli screenshot si generano con `APP_PASSWORD=… npm run screenshots` e il video con `APP_PASSWORD=… npm run demo` (richiedono Playwright installato con `npm run setup:screenshot`, ffmpeg/ffprobe nel PATH e un server avviato). Il video esce a 1920×1080 con cursore, intro/outro, lower-third, dissolvenze e musica generata dal codice.
- **Invio email reale**: senza `SMTP_HOST` configurato l'app scrive i file `.eml` in `./tmp/emails/` per scelta. L'invio via SMTP non e' esercitato dai test.
- **Provider AI**: senza `GEMINI_API_KEY` o `GROQ_API_KEY` le funzioni AI rispondono `503`. Gli smoke non li interrogano (consumano quota).
- **Servizi di terze parti**: disponibilita' e limiti di Overpass, Nominatim e Geoapify non dipendono da noi. L'app degrada con un warning e con i risultati delle altre fonti; gli smoke lo tollerano.
- **Accessibilita'**: `check:ui` esegue `axe-core` su ogni pagina e ogni tema (WCAG 2.0/2.1 A e AA) e intercetta skip-link, landmark, nomi accessibili e contrasto dei colori, ma non sostituisce la prova con uno screen reader ne' un audit manuale; Lighthouse non e' in CI.
- **Componenti React**: non ci sono test di rendering (nessun testing library): la logica e' nei moduli puri di `src/lib/` proprio per poterla testare senza browser.

## 10. Prima di una release

```bash
npm run qa                 # typecheck + lint + i18n + guard + allineamento D1/Prisma + test unitari
npm run build              # build di produzione (prisma generate + next build)
npm run setup              # DB e seed su un database nuovo, se serve

# con il server acceso su 3111:
SMOKE_PASSWORD='la-tua-password' npm run smoke:api
SMOKE_PASSWORD='la-tua-password' npm run smoke:geo
SMOKE_PASSWORD='la-tua-password' npm run perf:check
```

Poi un giro a mano nel browser sulle pagine principali (dashboard, ricerca, CRM con verifica e arricchimento, opportunita', ricevute, impostazioni, onboarding su un database vuoto).

## 11. Cosa gira in CI

`.github/workflows/ci.yml`, a ogni push e pull request:

- **job "app"**: `npm run qa` — che al suo interno esegue anche `check:schema`, cioe' le migrazioni D1 contro lo schema Prisma — e infine `npm run build` (la parte sui dati del guard rail di igiene viene saltata: li' non c'e' un database);
- **job "smoke-api"**: costruisce il **build di produzione**, prepara database e seed, avvia `next start`, lancia `npm run smoke:api` e `npm run test:flows` contro quel server e poi `node --import tsx scripts/check-hygiene.mjs --require-db`, che qui **pretende** il database e verifica che gli smoke non abbiano lasciato residui (lead, chiavi, verifiche orfane o doppie). Sullo stesso server installa Chromium e lancia `npm run check:ui -- --mobile`: 19 pagine (incluse la scheda di un lead e una ricevuta) in tema chiaro e scuro, a 1280x800 e a 390x844, console e layout;
- **job "docker"**: costruisce l'immagine dal `Dockerfile`, la avvia con un volume nuovo, attende `/api/health` e verifica che `/login` risponda `200` e che il database sia stato creato in `/data`. Serve a non scoprire a release fatta che il percorso Docker si e' rotto;
- **job "live"** (solo schedulato o con `workflow_dispatch`): costruisce il server di produzione, prepara database e seed, avvia `next start` e lancia `npm run smoke:geo` e `npm run perf:check`. Non e' un job richiesto dalle pull request: dipende da Overpass/Nominatim e da una macchina con il server acceso, quindi un loro disservizio non deve bloccare una modifica. I budget di performance sono calibrati su `npm start`, non sul server di sviluppo. Su un database senza lead i controlli che parlano dei dati vengono saltati con una riga `SKIP`, non falliti.
- **job "audit"** (solo settimanale): `npm audit` sulle dipendenze.

`smoke:geo` e `perf:check` restano lanciabili anche in locale, con la stessa password e lo stesso `SMOKE_BASE` descritti sopra. `smoke:geo` dipende dai servizi esterni live, `perf:check` da una macchina con il server di produzione acceso.
