# Lead Machine always-on

> **Questa guida richiede un host Docker e non è un'opzione gratuita garantita.** Per il deploy online gratuito, senza carta e senza VPS, usa [docs/CLOUDFLARE-FREE.md](../docs/CLOUDFLARE-FREE.md) con Cloudflare Workers + D1.

Questa cartella contiene un deploy riproducibile per tenere Lead Machine e la sua API sempre disponibili:

- **Caddy** davanti all'app, con HTTPS automatico (Let's Encrypt);
- **Next.js** in un container non privilegiato;
- **SQLite** in un volume Docker nominato (`leadmachine_data`), quindi persistente tra riavvii e aggiornamenti;
- `restart: unless-stopped` su entrambi i servizi;
- healthcheck dell'app e dipendenza di Caddy dall'app sana;
- backup SQLite online con `sqlite3 .backup`.

L'app non pubblica la porta 3000: solo Caddy espone 80/443.

> Questo stack è per **una sola istanza**. SQLite ha un solo writer: non aumentare le repliche dell'app. Se ti serve scalare orizzontalmente, passa a Postgres.

---

## 1. Prerequisiti

- un VPS Linux (Debian/Ubuntu va bene) con Docker Engine e Docker Compose v2;
- un dominio o sottodominio che punta all'IP del VPS (record DNS `A`, e `AAAA` se usi IPv6);
- porte **80** e **443** raggiungibili da Internet;
- SSH sulla porta 22 (o la tua porta, senza esporla nel compose).

Verifica:

```bash
docker --version
docker compose version
```

Se Docker non è installato, segui la documentazione ufficiale di Docker per la tua distribuzione. Non eseguire il compose come root senza motivo: aggiungi il tuo utente al gruppo `docker` oppure usa `sudo`.

---

## 2. Configurazione

Dalla root del repository:

```bash
cd deploy
cp .env.example .env
```

Modifica `deploy/.env`:

| Variabile | Cosa mettere |
|---|---|
| `DOMAIN` | Solo il dominio, senza `https://` (es. `crm.example.com`) |
| `NEXT_PUBLIC_BASE_URL` | Lo stesso dominio con `https://` |
| `APP_PASSWORD` | Una password lunga e unica, almeno 8 caratteri |
| `OSM_CONTACT_EMAIL` | Un indirizzo reale per le richieste OpenStreetMap |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | Facoltative, servono solo alle funzioni AI |

`deploy/.env` è ignorato da Git. Non committarlo e non inserire mai password o chiavi reali in `.env.example`.

Se cambi dominio, cambia **entrambe** le variabili `DOMAIN` e `NEXT_PUBLIC_BASE_URL` e ricostruisci l'immagine: il valore pubblico viene incorporato nel build di Next.js.

---

## 3. Avvio

```bash
cd deploy
docker compose up -d --build
```

Al primo avvio il container:

1. crea `/data/lead-machine.db` nel volume persistente;
2. applica lo schema Prisma;
3. esegue il seed iniziale (template e tag, senza dati inventati);
4. avvia Next.js su `0.0.0.0:3000`;
5. Caddy ottiene il certificato TLS e inizia a proxare `https://DOMAIN`.

Controlla:

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f caddy
```

L'app è pronta quando il servizio `app` è `healthy`. Poi apri:

```text
https://DOMAIN
```

Accedi con `APP_PASSWORD`, completa l'onboarding e crea la API key da **Impostazioni → API Key & Integrazioni esterne**.

Verifica anche l'endpoint pubblico:

```bash
curl -fsS https://DOMAIN/api/health
# {"ok":true,"service":"lead-machine","time":"..."}
```

---

## 4. Persistenza e aggiornamenti

Il database vive nel volume nominato `leadmachine_data`. Non usare `docker compose down -v`: `-v` cancella anche il database.

Aggiornamento del codice:

```bash
git pull
cd deploy
docker compose up -d --build
```

L'entrypoint applica `prisma db push` al database esistente senza cancellarlo. Il seed viene eseguito **solo al primo avvio**, per non sovrascrivere impostazioni e template personalizzati. Se vuoi rieseguire il seed manualmente:

```bash
docker compose exec app npm run db:seed
```

Il seed è idempotente per template e tag, ma non cancellare il database per "aggiornarlo".

---

## 5. Backup e ripristino

### Backup manuale

```bash
cd deploy
./backup.sh
```

Lo script usa `sqlite3 .backup` dentro il container (sicuro anche con l'app accesa), copia il file in `deploy/backups/`, lo comprime e conserva gli ultimi 14 giorni.

Automatizzalo con cron sull'host:

```cron
17 3 * * * /percorso/lead-machine/deploy/backup.sh >> /var/log/leadmachine-backup.log 2>&1
```

### Ripristino

Ferma l'app, ripristina il file nel volume e riavvia:

```bash
cd deploy
./restore.sh lead-machine-20261107-031700.db.gz
```

Il ripristino ferma solo `app`; Caddy resta in ascolto. Verifica sempre un backup su una copia prima di usarlo in produzione.

### Migrare il database locale esistente

Se hai già dati in `prisma/dev.db`, non copiarli nell'immagine: mettili nel volume, con l'app ferma.

```bash
cd deploy
docker compose stop app
docker run --rm \
  -v leadmachine_data:/data \
  -v "$PWD/../prisma:/src:ro" \
  alpine:3.21 \
  sh -c 'cp /src/dev.db /data/lead-machine.db && chown 1001:1001 /data/lead-machine.db'
docker compose start app
```

L'entrypoint applicherà lo schema al database esistente. Fai prima un backup del file locale.

---

## 6. Sicurezza e manutenzione

- [ ] `APP_PASSWORD` lunga e unica; nessuna password nel repository.
- [ ] `deploy/.env` fuori da Git.
- [ ] Firewall: solo SSH, 80 e 443. La porta 3000 non è pubblicata.
- [ ] DNS corretto prima di avviare Caddy, altrimenti il certificato non viene emesso.
- [ ] Backup automatico testato; conserva una copia fuori dal VPS.
- [ ] Aggiornamenti periodici di Docker, immagine Node e dipendenze.
- [ ] Log controllati: `docker compose logs --tail=100 app caddy`.
- [ ] API key separate per integrazione e con il minimo scope; vedi [la guida API](../docs/API-KEYS.md).

**Caddy e HTTPS:** la configurazione usa il comportamento predefinito di Caddy (HTTP-01/TLS-ALPN). Se metti il dominio dietro un proxy che intercetta il traffico HTTP, verifica che Caddy possa completare la sfida del certificato o configura il DNS challenge nella documentazione di Caddy.

**SQLite e concorrenza:** va bene per una singola istanza e per l'uso di un freelancer/studio. Non eseguire più repliche dell'app sullo stesso file. Per più writer, usa Postgres e un volume gestito dal database.

**Healthcheck:** `/api/health` è una liveness check pubblica, non interroga il database. Il container resta supervisionato da Docker; per una readiness completa aggiungi un monitor esterno sull'URL HTTPS e sui log.

---

## 7. Comandi utili

```bash
cd deploy

docker compose ps
docker compose logs -f --tail=100 app
docker compose logs -f --tail=100 caddy
docker compose restart app
docker compose up -d --build
docker compose exec app npm run db:seed
./backup.sh
```

Per fermare tutto senza cancellare i dati:

```bash
docker compose down
```

Per ripartire:

```bash
docker compose up -d
```

Non usare `down -v` se non vuoi eliminare il database e i certificati.
