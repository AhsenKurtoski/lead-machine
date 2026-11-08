# Deploy gratuito su Cloudflare Workers + D1

Questa è la strada per tenere Lead Machine online **senza VPS, senza carta di credito e senza costi ricorrenti**, usando il piano **Workers Free** e **D1 Free** di Cloudflare.

Cloudflare esegue l'app come Worker serverless: non c'è un processo da supervisionare e non c'è un disco da montare. Il database è D1, il database SQLite gestito da Cloudflare; i dati non vivono nel repository.

> **Limiti del piano gratuito:** il Worker ha 100.000 richieste al giorno e 10 ms di CPU per richiesta; D1 Free ha 500 MB per database (5 GB totali), 5 milioni di righe lette al giorno e 100.000 righe scritte al giorno. Se superi questi limiti il servizio gratuito smette di rispondere fino al reset o richiede un piano a pagamento. Non attivare un piano a pagamento per errore.

---

## 1. Prerequisiti

- account Cloudflare gratuito (il piano Workers Free non richiede carta di credito);
- Node.js 22 o successivo;
- questo repository con `npm install` già eseguito;
- `npx wrangler` disponibile dalle devDependencies.

Non serve un dominio: Cloudflare assegna un indirizzo HTTPS gratuito del tipo:

```text
https://lead-machine.<sottodominio>.workers.dev
```

---

## 2. Crea il database D1

Accedi a Cloudflare dal terminale:

```bash
npx wrangler login
```

Crea il database:

```bash
npx wrangler d1 create lead-machine
```

Il comando stampa un `database_id`. Aprilo in `wrangler.jsonc` e sostituisci il segnaposto:

```jsonc
"database_id": "00000000-0000-0000-0000-000000000000"
```

con l'ID restituito da Cloudflare.

Poi crea le tabelle e carica i template/tag iniziali:

```bash
npm run cf:migrate:remote
npm run cf:seed:remote
```

`cf:seed:remote` è idempotente per template e tag; non inserisce lead di esempio.

---

## 3. Configura la password

La password non va mai nel repository né in `wrangler.jsonc`. Salvala come secret Cloudflare:

```bash
npx wrangler secret put APP_PASSWORD
```

Inserisci una password lunga e unica (almeno 8 caratteri). Cloudflare la conserva come secret del Worker.

---

## 4. Primo deploy

Imposta l'URL pubblico **prima della build**, perché Next.js incorpora `NEXT_PUBLIC_BASE_URL` nel bundle:

```bash
NEXT_PUBLIC_BASE_URL="https://lead-machine.<sottodominio>.workers.dev" npm run cf:deploy
```

Su PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_URL="https://lead-machine.<sottodominio>.workers.dev"
npm run cf:deploy
```

Il comando:

1. esegue `opennextjs-cloudflare build`;
2. crea il Worker e carica gli asset;
3. pubblica su Cloudflare.

Se non conosci ancora il sottodominio, aprilo da **Workers & Pages** nella dashboard Cloudflare, oppure fai un primo deploy e poi ripeti la build con l'URL definitivo. L'URL `workers.dev` è gratuito; un dominio personalizzato è opzionale e richiede un dominio già posseduto.

Alla fine apri l'URL, accedi con `APP_PASSWORD` e completa l'onboarding.

Verifica:

```bash
curl -fsS https://lead-machine.<sottodominio>.workers.dev/api/health
# {"ok":true,"service":"lead-machine","time":"..."}
```

---

## 5. Sviluppo locale con D1

Il normale `npm run dev` continua a usare il file SQLite locale e non richiede Cloudflare.

Per provare il percorso Workers/D1:

```bash
cp .dev.vars.example .dev.vars
npm run cf:migrate:local
npm run cf:seed:local
npm run cf:build
npx wrangler dev --port 8799
```

`.dev.vars` è ignorato da Git. Non usare una password di produzione in questo file.

La build Workers produce anche `.open-next/`; è ignorata da Git. Se `wrangler dev` è già in esecuzione, fermalo prima di rilanciare `cf:build`: su Windows il file `.open-next` può essere bloccato.

---

## 6. Aggiornamenti

```bash
git pull
npm ci
npx wrangler d1 migrations apply lead-machine --remote
NEXT_PUBLIC_BASE_URL="https://lead-machine.<sottodominio>.workers.dev" npm run cf:deploy
```

Le migrazioni sono additive: non cancellare il database. Se aggiungi un modello o un campo, crea una nuova migrazione SQL e applicala prima del deploy.

---

## 7. Backup

D1 conserva un ripristino point-in-time di 7 giorni sul piano Free. Per un backup esportabile:

```bash
npx wrangler d1 export lead-machine --remote --output=lead-machine-backup.sql
```

Conserva il file fuori dal repository e verifica che contenga i dati attesi. Il comando di importazione va usato solo su un database di prova o dopo aver letto la documentazione D1: un import non è un semplice “ripristino” automatico.

---

## 8. Cosa non funziona su Workers

- **Screenshot dei siti**: richiede Playwright e un filesystem; su Workers risponde `501`. Resta disponibile nell'installazione locale.
- **Fallback email `.eml`**: su Workers non c'è un filesystem scrivibile. Senza SMTP configurato l'invio restituisce un errore chiaro `503`; configura SMTP in Impostazioni per inviare email.
- **Transazioni interattive Prisma**: D1 non le supporta. Il codice usa transazioni batch (`$transaction([...])`) per lead, import e ricevute.
- **Database locale**: su Cloudflare i dati sono in D1, non in `prisma/dev.db`. Usa l'export per i backup.

---

## 9. Sicurezza

- `APP_PASSWORD` solo come secret Cloudflare, mai in Git.
- `.dev.vars` e `.open-next/` sono ignorati.
- Non inserire chiavi AI, SMTP o API nel repository: usa **Impostazioni** oppure i secret Cloudflare.
- L'app resta a singolo utente; non condividere la password.
- Controlla i log da **Workers & Pages → lead-machine → Logs**.

---

## 10. Se i limiti gratuiti non bastano

Non serve cambiare architettura per iniziare. Se in futuro le richieste o la CPU superano il piano Free, Cloudflare mostrerà i limiti raggiunti; solo allora valuta un piano a pagamento o un VPS. Questo repository non attiva automaticamente alcun piano a pagamento.
