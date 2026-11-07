# API key di Lead Machine

Questa guida risponde a tre domande:

1. **come funziona** una API key di Lead Machine;
2. **per cosa si può usare** e cosa invece non può fare;
3. come tenerla **sempre attiva** senza trasformarla in un rischio.

> **In una frase:** una API key è una credenziale locale per chiamare `/api/v1/*`. Non è un token GitHub, non è la password dell'app e non è una chiave AI. Nasce già attiva, non ha una scadenza e resta valida finché il server è acceso e la chiave non viene sospesa o revocata.

---

## 1. API key, password e chiavi AI: non sono la stessa cosa

| Cosa | A cosa serve | Dove vive | Scade? |
|---|---|---|---|
| **API key** `lm_live_…` | Chiamare `/api/v1/*` da script, siti o automazioni | Database SQLite dell'app, solo come hash SHA-256 | No. Resta valida finché non viene sospesa/revocata |
| **`APP_PASSWORD`** | Entrare nella UI e gestire l'app (incluse le API key) | `.env` del server | No, ma cambiarla invalida le sessioni UI |
| **Sessione UI** | Cookie `lm_session` dopo il login | Browser, cookie HttpOnly | Sì, dopo 30 giorni |
| **`GEMINI_API_KEY` / `GROQ_API_KEY`** | Far funzionare le funzioni AI | `.env` o Impostazioni | Dipende dal provider |
| **Token GitHub** | Pubblicare codice sul repository | Il tuo account GitHub | Secondo GitHub |

**La API key non serve a GitHub.** GitHub ospita il codice e questa documentazione; non esegue l'app. La chiave si genera e funziona solo nell'istanza di Lead Machine che stai usando, in locale o su un server.

---

## 2. Come funziona una chiave

1. Apri **Impostazioni → API Key & Integrazioni esterne**.
2. Scegli un profilo (`full`, `read,search`, `read`, `write`) o una combinazione personalizzata.
3. Dai un nome alla chiave e premi **Crea chiave**.
4. La chiave completa `lm_live_…` viene mostrata **una sola volta**. Copiala subito.
5. Usala in una di queste due forme:

```http
x-api-key: lm_live_…
```

oppure:

```http
Authorization: Bearer lm_live_…
```

Il server calcola l'hash SHA-256 della chiave ricevuta e cerca quella riga nel database. **La chiave in chiaro non viene mai salvata.** Se perdi la chiave, non è recuperabile: devi revocarla e crearne una nuova.

Ogni chiamata riuscita aggiorna `lastUsedAt`, visible in Impostazioni: è il modo più semplice per capire se un'integrazione sta davvero usando la chiave.

### Creazione e gestione

Gli endpoint di gestione (`/api/keys`) sono **interni**: richiedono la sessione della UI, non accettano una API key. Una chiave compromessa non può quindi creare altre chiavi, cambiare i propri permessi o disattivare le altre.

| Azione | Effetto | Come |
|---|---|---|
| **Sospendi** | La chiave resta nel database, ma le chiamate ricevono `403` | `PATCH /api/keys/{id}` con `{"enabled":false}` o pulsante in Impostazioni |
| **Riattiva** | Torna a funzionare subito, senza cambiare la chiave | `PATCH` con `{"enabled":true}` o pulsante in Impostazioni |
| **Modifica permessi** | I nuovi scope valgono dalla chiamata successiva | `PATCH` con `{"permissions":"read,search"}` |
| **Revoca** | La chiave viene cancellata: le chiamate ricevono `401` e non è riattivabile | `DELETE /api/keys/{id}` |

---

## 3. Spento, attivo o tutti e due?

Non c'è un interruttore globale "API on/off". Se il processo di Lead Machine è acceso, `/api/v1/*` è raggiungibile; l'autenticazione decide solo se una richiesta può passare.

| Situazione | Cosa succede | Cosa fare |
|---|---|---|
| **Server spento** | L'API non risponde: è offline, non "disabilitata" | Avvia `npm start` (o il processo gestito in produzione) |
| **Chiave attiva** (`enabled: true`, default) | Funziona, se ha lo scope richiesto e non ha superato il limite | Lasciala attiva |
| **Chiave sospesa** (`enabled: false`) | `403` con messaggio chiaro; la chiave non è cancellata | Riattivala da Impostazioni |
| **Chiave revocata** | `401`; non si può riattivare | Creane una nuova |
| **Sessione UI scaduta** | La UI chiede di nuovo il login; la API key **non** scade con la sessione | Fai login quando devi gestire l'app |
| **UI + API insieme** | Entrambe funzionano: la UI usa la password/sessione, l'API usa la chiave | È il funzionamento normale |
| **API key + password** | Non si escludono: una non disattiva l'altra | Puoi tenerle attive entrambe |
| **`APP_PASSWORD` mancante** | La UI e la gestione delle chiavi sono bloccate (fail-closed, `503`) | Imposta una password di almeno 8 caratteri |

### "La voglio sempre attiva"

La configurazione predefinita è già "sempre attiva":

- la chiave nasce con `enabled: true`;
- non ha una data di scadenza;
- non viene invalidata dalla scadenza della sessione UI;
- resta valida finché non la sospendi, la revochi o il database viene eliminato/ripristinato senza quella riga.

Per ottenere un servizio realmente sempre disponibile, però, non basta la chiave:

1. **Tieni il server acceso** con un process manager (systemd, PM2, Docker con `restart: unless-stopped`, o il meccanismo del tuo host).
2. **Usa un database persistente.** SQLite deve stare su un volume che sopravvive ai riavvii. Un deploy serverless con filesystem effimero può perdere il database e quindi le chiavi.
3. **Imposta `APP_PASSWORD`** (almeno 8 caratteri) e `NEXT_PUBLIC_BASE_URL` corretto.
4. **Metti l'app dietro HTTPS** se la raggiungi da fuori; non esporre direttamente la porta 3000.
5. **Non sospendere la chiave** e non revocarla: sono gli unici "interruttori" della singola chiave.
6. **Fai backup del database** e conserva la chiave nel gestore di segreti dell'integrazione, non nel codice.

> **Attenzione:** "sempre attiva" significa anche "sempre valida se qualcuno la ruba". Non esiste una scadenza automatica. Usa una chiave diversa per ogni integrazione, concedi solo gli scope necessari e revoca subito una chiave se sospetti una fuga.

---

## 4. Permessi e limiti

Gli scope sono applicati davvero su ogni endpoint. Una chiave con solo `read` non può scrivere, cercare o usare l'AI, anche se conosce l'URL.

| Scope | Cosa consente | Endpoint |
|---|---|---|
| `read` | Leggere i lead salvati e il dettaglio di un lead | `GET /api/v1/leads`, `GET /api/v1/leads/{id}` |
| `write` | Creare un nuovo lead | `POST /api/v1/leads` |
| `search` | Cercare attività dal vivo su OpenStreetMap (e fonti extra configurate) | `POST /api/v1/search` |
| `ai` | Generare un sito vetrina per un lead | `POST /api/v1/demo/generate` |

**Profili pronti:**

- `full` → `read,write,search,ai`
- `search` → `read,search`
- `readonly` → `read`
- `writeonly` → `write`
- personalizzato → la combinazione che scegli

Se crei una chiave senza indicare `permissions`, il default è **`read`**: è il minimo privilegio, non un permesso completo implicito.

**Limiti per chiave** (in memoria, si azzerano al riavvio del processo):

| Operazione | Limite |
|---|---|
| Lettura lead | 300 richieste/minuto |
| Creazione lead | 60 richieste/minuto |
| Ricerca geografica | 30 richieste/minuto |
| Generazione sito AI | 15 richieste/minuto |

I limiti sono separati per chiave: due integrazioni diverse non si bloccano a vicenda. Se esegui più processi o più repliche, ogni processo ha il proprio contatore: per un limite condiviso serve un limiter esterno.

---

## 5. Per cosa si può usare

La API v1 è pensata per una **singola installazione**, non per utenti o clienti separati: tutte le chiavi vedono gli stessi lead. Detto questo, gli usi pratici sono questi.

### 5.1 Leggere lead in un'altra dashboard o BI

Scope: `read`. Esempio: portare i lead senza sito in un foglio di calcolo, in un report o in uno strumento di analisi.

```bash
curl -H "x-api-key: lm_live_…" \
  "http://localhost:3000/api/v1/leads?hasWebsite=false&city=Milano&limit=100"
```

### 5.2 Creare lead da un form o da un sito

Scope: `write`. Il form del tuo sito invia i dati a un piccolo backend, che chiama `POST /api/v1/leads`. Non mettere mai la chiave nel JavaScript pubblico: chiunque la vedrebbe.

```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: lm_live_…" \
  -d '{"name":"Osteria Da Mario","city":"Milano","category":"ristorante","phone":"+39 333 1234567"}'
```

### 5.3 Automazioni e agenti AI

Scope: `read,search,write` (e `ai` se devono generare siti). Un'automazione (n8n, Make, Zapier, uno script o un agente) può:

1. cercare attività in una zona con `POST /api/v1/search`;
2. leggere i lead già salvati;
3. creare un lead quando trova un contatto interessante;
4. generare una proposta/sito demo con `POST /api/v1/demo/generate`.

### 5.4 Widget di ricerca dietro un tuo backend

Scope: `search`. Un sito può mostrare una ricerca attività, ma la chiamata deve passare dal tuo server: la chiave resta lì. La risposta include i risultati e un array `warnings` se una fonte gratuita (per esempio Overpass) è lenta o non disponibile.

### 5.5 Generazione di siti vetrina

Scope: `ai`. Richiede almeno una chiave AI configurata (`GEMINI_API_KEY` o `GROQ_API_KEY`); senza provider l'endpoint risponde con un errore chiaro. Con `force: false` un sito già generato viene restituito dalla cache.

### 5.6 Sincronizzazione da un altro CRM

Scope: `read,write`. Puoi leggere i lead e crearne di nuovi. **Non** puoi aggiornare o cancellare un lead via `/api/v1/*`: per farlo usa la UI o gli endpoint interni autenticati con la sessione.

### Cosa non può fare

- non crea, sospende o revoca altre API key;
- non cambia le impostazioni dell'app;
- non invia email o WhatsApp;
- non modifica o cancella lead esistenti;
- non crea o modifica ricevute: il dettaglio di un lead include quelle già esistenti, ma non esiste un endpoint per gestirle separatamente;
- non accede a impostazioni o altre entità fuori dagli endpoint documentati;
- non aggira gli scope: sono controllati sul server a ogni chiamata.

Se ti serve una di queste capacità, è una nuova funzione da progettare e testare, non qualcosa che si attiva con un permesso.

---

## 6. Sempre attiva: checklist di produzione

- [ ] Server gestito da systemd/PM2/Docker con riavvio automatico.
- [ ] Database SQLite su volume persistente e backup periodico.
- [ ] `APP_PASSWORD` impostata (minimo 8 caratteri) e conservata nel gestore di segreti.
- [ ] `NEXT_PUBLIC_BASE_URL` uguale all'URL pubblico reale.
- [ ] HTTPS davanti all'app; porta applicativa non esposta direttamente.
- [ ] Una API key per integrazione, con il profilo più ristretto che basta.
- [ ] Chiave salvata solo lato server, mai in un bundle browser o in un repository.
- [ ] `lastUsedAt` monitorato; chiave sospesa o revocata se non serve più.
- [ ] Rotazione: crea la nuova chiave, aggiorna l'integrazione, revoca la vecchia.
- [ ] Backup testato: senza database, le chiavi non esistono più.

**CORS è aperto (`*`).** Questo permette a un'app browser su un altro dominio di chiamare l'API, ma significa anche che la chiave non è protetta dal browser: se la metti in JavaScript, chiunque può copiarla. Per un'app pubblica usa un backend tuo come proxy.

---

## 7. Errori tipici

| Codice | Significato | Cosa controllare |
|---|---|---|
| `401` | Chiave mancante, sconosciuta o revocata | Header `x-api-key` / `Authorization: Bearer`, chiave copiata bene |
| `403` | Chiave sospesa **oppure** scope mancante | Impostazioni → stato chiave e permessi; il body indica `requiredScope` |
| `400` | Parametri non validi (città assente, limiti, URL, email) | Body della richiesta e messaggio di errore |
| `404` | Lead o id inesistente | L'id passato nell'URL |
| `429` | Limite per chiave superato | Header `Retry-After`; riduci la frequenza |
| `500` / `502` / `503` | Errore interno o servizio esterno/AI non disponibile | Log del server, provider AI, disponibilità delle fonti |

Per il contratto completo, gli esempi e tutti i parametri: [API.md](../API.md).

---

## 8. Domande frequenti

**La chiave scade?** No. Non c'è una scadenza automatica; resta valida finché non la sospendi o la revochi.

**Devo attivare qualcosa?** No. L'API è disponibile quando il server è acceso e la chiave nasce già attiva.

**Posso usare la stessa chiave per più progetti?** Sì, ma è meglio una chiave per integrazione: revocare una sola integrazione diventa molto più semplice.

**Posso tenere attivi contemporaneamente UI e API?** Sì. La UI usa la password/sessione; l'API usa la chiave. Sono due canali indipendenti.

**Posso recuperare una chiave persa?** No, viene salvato solo l'hash. Creane una nuova e revoca quella vecchia.

**La chiave funziona su GitHub?** No. GitHub non esegue l'app. La chiave funziona solo sulla tua istanza di Lead Machine.

**La chiave è per un solo utente?** L'app è single-user: tutte le chiavi accedono agli stessi dati. Non usarla per separare clienti o tenant diversi.

**Se sospendo la chiave per errore?** Puoi riattivarla subito da Impostazioni; la chiave originale torna a funzionare.
