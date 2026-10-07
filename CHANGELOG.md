# Changelog

Tutte le modifiche rilevanti di Lead Machine.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/IT/1.1.0/) e il versionamento è [SemVer](https://semver.org/lang/it/).

## [1.0.0] - 2026-10-07

Prima release pubblica di Lead Machine 🎉

### Aggiunto
- **Ricerca lead geografica** su OpenStreetMap (Overpass): categoria + raggio + città, con deduplica a 3 livelli (OSM ID, `name+city`, fuzzy).
- **Lead scoring 0–100** assistito da AI con giustificazioni, heatmap di produttività, tag e stati personalizzabili.
- **CRM completo**: timeline unificata (chiamate, email, WhatsApp, appunti, follow-up), bucket "oggi / 7 giorni / scaduti".
- **Preventivi e fatture** con righe, IVA, sconti, PDF multilingua e workflow Bozza → Inviato → Accettato → Fatturato → Pagato.
- **Mappa interattiva** (Leaflet) con clustering e azioni rapide per lead.
- **Portfolio, listino e report** con esportazione CSV / JSON.
- **AI opzionale** con doppio provider (Gemini + Groq) e failover automatico.
- **API pubblica `/api/v1/*`**: API key hashate SHA-256, 4 profili di accesso, scope enforcement reale per endpoint, rate limit per chiave, CORS aperto. Riferimento completo in API.md.
- **Interfaccia in 7 lingue** (it, en, de, fr, es, pt, sl) con formattazione nativa di date, valute, distanze e PDF.
- **Sito marketing + demo live** in 7 lingue con BYOK (chiavi AI crittografate AES-256-GCM nel browser) e 10 crediti AI gratuiti.
- **CI GitHub Actions**: typecheck, lint, parità i18n, build e smoke test end-to-end delle API key a ogni push.

### Sicurezza
- Aggiornato **Next.js 14.2.15 → 15.5.27**: chiuse 23 advisory aggregati, inclusi RCE nell'Image Optimization API e DoS/SSRF su Server Actions.
- Aggiornato **nodemailer 6.x → 10.0.15** (advisory di dominio email).
- `npm audit` aggiornato su tutte le dipendenze compatibili; nessuna vulnerabilità **critical** residua.

### Note di migrazione
- Next.js 15: `params` e `searchParams` sono ora asincroni nelle route e nelle pagine (migrazione applicata con il codemod ufficiale).

## [0.9.0] - 2026-09-28

- Enforce reale degli scope per API key con profili di accesso professionali (`read`, `write`, `search`, `ai`).
- Gateway API pubblico `/api/v1/*` con rate limiting per chiave e CORS.
- UI modernizzata (toast, dialog di conferma), 77 nuove chiavi i18n.
- Fix critico: modelli AI ritirati dai provider sostituiti con fallback automatico.
