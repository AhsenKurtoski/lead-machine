# Triage degli alert CodeQL

La scansione è attiva su push e pull request (`codeql.yml`) e gira anche ogni
lunedì. Ogni alert va letto: qui c'è la decisione e il motivo, così la prossima
persona non deve rifare l'analisi da zero.

Categorie: **corretto** (codice cambiato), **falso positivo** (il flusso non
esiste o è già neutralizzato), **solo test** (script di verifica, non runtime).
Riferimento: main `63c9989` e stato degli alert al 26/11/2026.

## Corretti

| Alert | Regola | Posizione | Correzione |
|---|---|---|---|
| #9, #8 | `js/incomplete-sanitization` | `scripts/demo-gif.mjs` | Il percorso del file `.ass` passato a ffmpeg ora passa da `escapeFilterPath()`: separatori Windows normalizzati e poi `\`, `:`, `'` protetti **in un solo passaggio**. Due `replace` in sequenza lasciavano barre annidabili. |
| #6 | `js/insecure-randomness` | `scripts/check-auth.mjs` | La password effimera del server di prova usa `randomBytes(12)` invece di `Math.random()`. |

## Falsi positivi

| Alert | Regola | Posizione | Perché |
|---|---|---|---|
| #5 | `js/insufficient-password-hash` | `src/lib/api-auth.ts:13` | `hashApiKey()` non cifra una password scelta da una persona: calcola SHA-256 su `lm_live_` + 24 byte da `randomBytes()` (192 bit di entropia). Non esiste un dizionario da provare, e SHA-256 è la scelta giusta per un token ad alta entropia; un KDF lento qui aggiungerebbe solo latenza a ogni richiesta API. |
| #3 | `js/clear-text-logging` | `scripts/smoke-api.mjs:233` | L'output riporta stato HTTP e lo scope (`permissions`, es. `read,search`). La chiave grezza (`rawKey`) resta in memoria e viene usata solo per le richieste: non finisce in nessuna riga stampata. |
| #2 | `js/clear-text-logging` | `scripts/check-auth.mjs:247` | `withPassword` e `withoutPassword` sono handle dei processi di prova; nel riepilogo viene stampato solo il numero di controlli superati. |
| #1 | `js/clear-text-logging` | `scripts/check-auth.mjs:38` | `record()` stampa il nome del controllo e un dettaglio (`HTTP 200`, `cookie presente`). La password è solo nella variabile d'ambiente del processo figlio, non nei log. |

## Solo test

| Alert | Regola | Posizione | Perché |
|---|---|---|---|
| #7 | `js/incomplete-url-substring-sanitization` | `src/lib/osm.test.ts:64` | È un'asserzione su una **email segnaposto** (`anonimo@example.com`) che non deve finire nello User-Agent, non un controllo su un URL. |

## Come verificare

```bash
npm run qa            # lint + typecheck + test
npm run check:schema  # Prisma ↔ D1
```

Dopo il merge di una correzione, CodeQL riclassifica da solo gli alert risolti:
se uno resta aperto nonostante il codice nuovo, il triage va rivisto, non
copiato.
