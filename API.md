# Lead Machine — REST API Reference

All API routes live under `/api/*` and serve the single-user app that runs on `localhost:3000` (or wherever you deploy it). Most routes accept JSON and return JSON. Errors return `{ error: "…" }` with an appropriate HTTP status.

> **Note on auth**: The app is single-user, not unauthenticated. Every `/api/*` route except `/api/v1/*`, `/api/auth/*` and `/api/health` requires the HttpOnly session cookie created by `POST /api/auth/login` after you set `APP_PASSWORD`. The `/api/v1/*` surface authenticates with an API key instead. Without `APP_PASSWORD`, protected routes fail closed with `503` on every host; only `/login`, `/api/auth/*` and `/api/health` remain public.

> **No activation, no cloud, no sign-up.** `lm_live_…` keys are created and validated **on your machine**: only the SHA-256 hash is stored, in the same SQLite file as your leads. Nothing is phone-home checked, there is no license server and no trial. Download the repo, run `npm install && npm run setup && npm run dev` and every key-less feature (search, map, CRM, verification, receipts, demo sites, backup) is already working; the only keys the app can use are the **optional third-party ones** you may add in Impostazioni (AI, Geoapify, SMTP), and each of them degrades with a clear message when it is missing.

---

## 🔑 API keys: how to get one and what you need

> **TL;DR (humans & AI agents)**: start the app → create a key in **Impostazioni → API Key & Integrazioni esterne** (or `POST /api/keys`) → call `/api/v1/*` with `x-api-key: lm_live_…`. The secret is shown **once**; only its SHA-256 hash is stored. Each key carries scopes (`read`, `write`, `search`, `ai`) that are enforced on every endpoint.
>
> **Practical guide (Italian)**: [docs/API-KEYS.md](./docs/API-KEYS.md) — always-on behaviour, suspended vs revoked keys, concrete use cases and safe operation.

### What you need

| Requirement | Details |
|---|---|
| **Running instance** | Node.js `18.18+` (20 LTS recommended) · `npm install` · `npm run setup` (creates + seeds the SQLite DB) · `npm run dev` (dev) or `npm run build && npm start` (prod) |
| **Base URL** | `http://localhost:3000` by default. Behind a reverse proxy set `NEXT_PUBLIC_BASE_URL` in `.env`. |
| **API key** | One `lm_live_…` key per integration. Create it in the UI (below) or with `POST /api/keys`. |
| **Scopes** | Pick the narrowest profile for your use case — see [20.3](#203-scopes-per-key-permissions). |
| **AI features (optional)** | At least one provider key in `.env`: `GEMINI_API_KEY` ([Google AI Studio](https://aistudio.google.com/) → *Get API key*) or `GROQ_API_KEY` ([Groq Console](https://console.groq.com/keys) → *Create API Key*). Without them every non-AI endpoint still works; `POST /api/v1/demo/generate` answers `503 No AI provider configured`. |

### Get a key — UI path (30 seconds)

1. Start the app: `npm install && npm run setup && npm run dev` → <http://localhost:3000>.
2. Open **Impostazioni → API Key & Integrazioni esterne**.
3. Choose a **profile** (full integration / business search / read only / insert only / custom scopes) and give the key a name.
4. Click **Crea chiave**: the secret `lm_live_…` is displayed **exactly once** — copy it now. Later calls only show the `lm_live_ab12…` prefix.
5. Done. Suspend, edit scopes or revoke the key from the same panel at any time.

### Get a key — programmatic path (for scripts and AI agents)

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"My AI Agent","permissions":"read,search"}'
```

**Response (200)**

```json
{
  "ok": true,
  "apiKey": { "id": "clx…", "name": "My AI Agent", "keyPrefix": "lm_live_ab12", "permissions": "read,search", "enabled": true },
  "rawKey": "lm_live_3f9c…"
}
```

`rawKey` exists only in this response. Store it in your secret manager immediately.

### Verify a key

```bash
curl -s http://localhost:3000/api/v1/leads?limit=1 \
  -H "x-api-key: lm_live_…"
```

`200` = the key works. `401` = missing/unknown key · `403` = suspended or missing scope (the body says which one) · `429` = rate limited (see `Retry-After`).

### Using the key

- Headers: `x-api-key: lm_live_…` **or** `Authorization: Bearer lm_live_…`.
- Content type: `application/json` for POST/PATCH bodies.
- Endpoints: `GET /api/v1/leads`, `GET /api/v1/leads/{id}`, `POST /api/v1/leads`, `POST /api/v1/search`, `POST /api/v1/demo/generate` — details in [20.6](#206-endpoints).
- CORS is open (`*`): the key also works from browser apps on any domain.

### Always on, suspended, or both?

There is **no global API on/off switch**. `/api/v1/*` is available whenever the
server is running; every key is created with `enabled: true` and has **no expiry**.
It stays valid until you suspend it (`PATCH {"enabled": false}` → `403`), revoke it
(`DELETE` → `401`), or remove its database row. Reactivating a suspended key is
immediate and keeps the same secret.

The web session and the API key are **independent channels**: the UI uses
`APP_PASSWORD` and a 30-day session cookie, while `/api/v1/*` uses the key. Both
can be active at the same time. A session expiring does not invalidate API keys;
a key cannot access the UI, and a session cookie cannot authenticate `/api/v1/*`.

For an always-on deployment, keep the server running under a process manager,
keep SQLite on a persistent volume, set `APP_PASSWORD`, and use HTTPS if the app
is reachable from outside. The key itself is always active by default; the only
per-key switches are **suspend** and **revoke**.

### Machine-readable contract (for AI agents)

| Situation | Status | Body / headers |
|---|---|---|
| Success | `200` / `201` | JSON resource |
| Missing or invalid key | `401` | `{ "ok": false, "error": "…" }` |
| Suspended key | `403` | `{ "ok": false, "error": "…" }` |
| Missing scope | `403` | `{ "ok": false, "error": "…", "requiredScope": "search", "currentScopes": ["read"] }` + `X-Required-Scope` response header |
| Unknown scope on create/patch | `400` | error message, nothing is stored |
| Not found | `404` | `{ "ok": false, "error": "…" }` |
| Rate limited | `429` | `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Slow or unavailable source | `200` | `"warnings": ["…"]` alongside partial results |

Budgets are counted **per API key** (not per IP): parallel integrations never block each other.

---

## Conventions

- All dates are ISO-8601 strings (`"2026-01-15T09:30:00.000Z"`) unless noted.
- Pagination / limits use `?take=` and `?skip=` query params where supported.
- Write endpoints return `{ id, ok: true }` or a richer resource on success.
- Inputs are validated with the helpers in `src/lib/security.ts` (length bounds, type coercion, sanitization).

---

## 1. Settings (`/api/settings`)

### `GET /api/settings`
Returns all app-level key/value settings.

**Response (200)**
```json
{
  "settings": {
    "company_name": "Web Agency Demo",
    "company_vat": "IT12345678901",
    "company_email": "hello@example.com",
    "company_phone": "+39 0439 000000",
    "company_city": "Milano",
    "company_address": "Via Roma, 1",
    "company_website": "https://example.com",
    "default_city": "Milano, Italia",
    "locale": "it",
    "currency": "EUR",
    "gemini_api_key": "••••••••",
    "groq_api_key": "••••••••",
    "smtp_pass": "••••••••",
    "...": "..."
  }
}
```

> **Security note:** Keys ending in `_api_key` or `_pass` are returned masked (`••••••••`) so that the UI can display them without leaking secrets.

### `POST /api/settings`
Upsert one or more settings in a single **atomic transaction**.

**Body (JSON)**
```json
{
  "settings": {
    "company_name": "Nova Impresa GmbH",
    "locale": "de",
    "currency": "EUR"
  }
}
```

**Validation rules:**
- Keys must be in the `ALLOWED_KEYS` whitelist (see `src/app/api/settings/route.ts`). Unknown keys are silently ignored.
- String values are truncated to a per-key `maxLen`.
- Values equal to the masked sentinel (`••••••••`) are skipped (so sending the masked `gemini_api_key` back from the UI won't overwrite your real key with `*`s).
- Locale must match `^[a-z]{2}$`; currency must match `^[A-Z]{3}$`.

**Response (200)**
```json
{ "ok": true, "updated": 3 }
```

**Rate limit:** 60 requests / minute per IP+UA.

---

## 2. Leads (`/api/leads`)

### `GET /api/leads`
Returns the leads used by the CRM and dashboard, each with its tags, ordered by
priority score descending and capped at 2000 rows. There are no query parameters:
filter in the app or use `GET /api/v1/leads`, which has `city`, `category`, `status`,
`hasWebsite`, `minScore`, `limit` and `offset`.

**Response (200)**
```json
{
  "ok": true,
  "leads": [
    {
      "id": "cl...",
      "osmId": "node/123",
      "name": "Caffè Centrale",
      "category": "bar",
      "subcategory": "Bar/Caffè",
      "city": "Milano",
      "email": "info@caffe.example",
      "phone": "+39 02 1234567",
      "website": "https://caffe.example",
      "hasWebsite": true,
      "websiteStatus": "ok",
      "status": "NUOVO",
      "priorityScore": 72,
      "tags": [{ "id": "cl...", "name": "calda" }]
    }
  ]
}
```

### `POST /api/leads`
Saves the leads you picked from a search (or any other source). Body `{ "candidates": [...] }`, max 500 per call.

Deduplication runs in three steps: internal `osmId`, internal `name + city`, then the same two checks against the rows already in the database. Every stored lead also gets a `nuovo_lead` notification in the same Prisma transaction.

**Body (JSON)**
```json
{
  "candidates": [
    {
      "name": "Pizzeria Da Nino",
      "category": "ristorante",
      "categoryLabel": "Ristorante",
      "city": "Milano",
      "addressFull": "Via Roma 12",
      "lat": 45.4642,
      "lng": 9.19,
      "phone": "+39 02 1234567",
      "email": "nino@example.com",
      "website": null,
      "hasWebsite": false,
      "priorityScore": 80,
      "priorityReason": "Nessun sito trovato",
      "source": "overpass",
      "osmId": "node/123"
    }
  ]
}
```

**Validation:**
- Only `name` is required; candidates without a name are dropped.
- `lat`/`lng`: bounded to ±90 / ±180.
- All strings: trimmed, length bounded, HTML stripped.
- A candidate without a city stays `null`: the API never invents one.

**Response (200)**
```json
{ "ok": true, "saved": 3, "skipped": 2 }
```

**Rate limit:** 30 requests / minute per IP+UA (batch-aware, not per-record).

---

### `GET /api/leads/[id]`
Fetch one lead with its `tags` and its complete `activities` history (the same shape the CRM page uses). Verification outcomes live in a separate endpoint (`GET /api/leads/{id}/verification`), receipts in `GET /api/receipts?leadId=`.

**Response (200)**
```json
{
  "ok": true,
  "lead": {
    "id": "cl...",
    "name": "...",
    "...": "...",
    "tags": [{ "id": "cl...", "name": "calda" }],
    "activities": [
      { "id": "cl...", "type": "chiamata", "description": "Richiamare lunedi", "createdAt": "2026-01-15T09:30:00.000Z" }
    ]
  }
}
```

### `PATCH /api/leads/[id]`
Update one lead. Body is a partial Lead object (same fields as `POST /api/leads`). Fields are validated: unknown statuses, malformed emails and invalid URLs are rejected. There is no implicit `lastContactAt` timestamp; record contact through activities and follow-ups.

### `DELETE /api/leads/[id]`
Hard-delete one lead. Its activities, follow-ups, appointments, notifications, verifications and receipts are removed with it through Prisma `onDelete: Cascade`.

---

### `POST /api/leads/bulk`
Delete or update many leads by ID. Rate limit: 15/min.

**Body (JSON, delete)**
```json
{ "ids": ["cl1...", "cl2..."], "action": "delete" }
```
Response `{ ok: true, deleted: 2 }`.

**Body (JSON, set status)**
```json
{ "ids": ["cl1...", "cl2..."], "action": "status", "status": "CONTATTATO" }
```
Response `{ ok: true, updated: 2 }`; the change is also written to each lead's activity log.

---

## 3. Tags

There is no `/api/tags` route: tags are simply a relation on the lead. Set them by
sending `tags: ["calda", "wifi"]` to `PATCH /api/leads/{id}` — the names are trimmed,
created when new, and the list replaces the previous one.

---

## 4. Appointments (`/api/appointments`)

- `GET /api/appointments?from=&to=&leadId=` → list appointments in a range (ISO strings).
- `POST /api/appointments` → create. Body: `{ leadId, title, description?, startsAt, location?, color? }`.
- `PATCH /api/appointments/:id` → update.
- `DELETE /api/appointments/:id` → delete.

### `GET /api/appointments/ics?leadId=`
Returns a `text/calendar` `.ics` file with the appointments (all of them, or only one
lead's when `leadId` is passed). Import it directly into Google Calendar / Outlook /
Apple Calendar.

---

## 5. Activities (`/api/activities`)

Read-only log of everything that happened on a lead. The app writes these rows itself
(calls, emails, messages, status changes, verifications), so there is no write endpoint.

- `GET /api/activities?type=&leadId=` → last 200 activities, newest first, each with the lead's `id` and `name`. Response `{ activities: [...] }`.
- `type` values written by the app: `chiamata`, `email`, `whatsapp`, `nota`, `stato`, `sistema`, `appuntamento`, `ricerca`.

---

## 6. Data verification & follow-ups

Lead Machine never calls a phone number, email, website, address or social profile
"verified" without evidence. One row per field is stored with **status, source,
evidence and timestamp**, so the UI can always show *why* a datum is trusted.

### `POST /api/leads/{id}/verify`
Runs a real check on the lead's five fields and replaces the previous snapshot
(the newest snapshot always wins). Rate limit: 60/min, `404` when the lead is unknown.

**Response (200)**
```json
{
  "ok": true,
  "results": [
    {
      "field": "email",
      "status": "verificato",
      "source": "controllo_diretto",
      "evidence": "Il dominio accetta email (record MX presenti).",
      "checkedAt": "2026-01-15T09:30:00.000Z"
    }
  ],
  "summary": {
    "total": 5,
    "verified": 2,
    "pending": 2,
    "problems": 1,
    "overall": "attenzione",
    "label": "Da controllare"
  }
}
```

Besides `results` and `summary`, both `POST /api/leads/{id}/verify` and
`GET /api/leads/{id}/verification` return
`queue: { scheduled: [{ field, attempts, nextAttemptAt, reason, lastError }], cleared: [{ field, outcome }] }`
— the checks postponed for a network problem, and the ones that left the queue
in this run (`outcome` ∈ `risolto`, `abbandonato`). `POST` fills both;
`GET /api/leads/{id}/verification` is a read-only snapshot, so it reports the
postponed checks and leaves `cleared` empty.

Which check runs for each field:

| Field | Real check performed |
|---|---|
| `phone` | Number shape (landline / mobile). WhatsApp presence is taken from imported data, not confirmed. |
| `email` | Syntax, disposable-domain list, DNS **MX** records of the domain |
| `website` | HTTP reachability of the URL (a real request, nothing assumed) |
| `address` | Street plus city or coordinates completeness (format only, not geocoding) |
| `social` | A known Instagram / Facebook / TikTok link is present and plausible; the profile is not opened |

A stored WhatsApp number or social link is not proof of ownership: those fields stay `da_verificare` unless a real check was performed.

- `status` ∈ `verificato`, `da_verificare`, `non_raggiungibile`, `non_valido`, `assente`.
- `source` ∈ `openstreetmap`, `controllo_diretto`, `ricerca_web`.
- `summary.overall` ∈ `verificato`, `da_verificare`, `attenzione` (any `non_valido` / `non_raggiungibile` field makes it `attenzione`).

### `GET /api/leads/{id}/verification`
Returns the last stored snapshot for that lead (no network calls, safe to poll).

### `POST /api/leads/verify`
Bulk verification. Body `{ "leadIds": ["cl1…", "cl2…"] }` — at most 20 leads per
call, the rest are reported as skipped. Response `{ ok: true, done, skipped }`;
`400` when the list is empty. Rate limit: 6/min.

### Retrying checks that could not run (`/api/leads/verify/retry`)

A check that could not be performed — the DNS resolver did not answer, the site
gave no response at all — is **not a verdict**: the field stays `da_verificare`
and is queued for a retry with growing delays (5 min, 10, 20, 40, capped at 6
hours) and at most 5 attempts. A definitive DNS answer (domain missing, no MX
record) is a verdict and never enters the queue. The app runs the sweep when it
opens; these two endpoints are how you inspect or drive it.

- `GET /api/leads/verify/retry?limit=` (max 200, default 50) → the queue, soonest
  first: `{ ok, count, due, queue: [{ leadId, leadName, city, field, attempts,
  nextAttemptAt, reason, lastError, due }] }`, where `field` ∈ `email`, `website`
  and `due` says whether it is time to retry it now.
- `POST /api/leads/verify/retry` → retries the checks that are due (at most 5
  leads per call, sequential, to be gentle on the network). Response
  `{ ok, processed, resolved, rescheduled, dropped, remaining, leads: [{ id, name }] }`:
  `resolved` counts fields that no longer need a retry (the check succeeded, or
  there is nothing left to check), `rescheduled` the ones postponed again with
  the same problem, `dropped` the ones given up after 5 attempts — those stay
  `da_verificare`, with no more automatic retries. Rate limit: 6/min.

### Follow-ups (`/api/followups`)
Follow-up reminders attached to a lead (independent from verification):

- `GET /api/followups?leadId=&status=` → list (`PENDING`, `DONE`, `SKIPPED`).
- `POST /api/followups` → body `{ leadId, dueAt, title?, note?, channel? }`.
- `PATCH /api/followups/:id` → update status (`PENDING` → `DONE` / `SKIPPED`).
- `DELETE /api/followups/:id`.
- `POST /api/followups/auto` → generate the default follow-up sequence for a lead.

---

## 7. Payment receipts (`/api/receipts`)

A receipt certifies that a client **paid**: number, amount, method and date. It is
**not a fiscal document** — there are no VAT rates, tax IDs, discounts or deposits.

### `GET /api/receipts?leadId=`
List receipts (newest payment first); each row includes the lead's `id` and `name`.
Response `{ receipts: [...] }`.

### `POST /api/receipts`
Register a payment. Rate limit: 40/min.

**Body (JSON)**
```json
{
  "leadId": "cl...",
  "description": "Sito vetrina - saldo",
  "amount": 850,
  "method": "bonifico",
  "paidAt": "2026-01-15",
  "notes": "..."
}
```

- `leadId` is required (`400` when missing, `404` when the lead does not exist).
- `method` ∈ `contanti` (default), `bonifico`, `carta`, `altro`; unknown values fall back to `contanti`.
- `amount` is a decimal number (max 1 000 000), rounded to cents and never negative.
- `paidAt` accepts an ISO date and defaults to now; an invalid date returns `400`.
- The number is generated automatically as `RICEVUTA-YYYY-NNN` and a system activity is logged on the lead.

**Response (201)**
```json
{ "ok": true, "receipt": { "id": "cl...", "number": "RICEVUTA-2026-001", "amount": 850, "method": "bonifico", "paidAt": "2026-01-15T00:00:00.000Z" } }
```

### `GET /api/receipts/{id}`
Single receipt with its lead (`{ ok: true, receipt }`; `404` when unknown).

### `PATCH /api/receipts/{id}`
Fix `description`, `notes`, `amount`, `method` or `paidAt` — only the fields you send
are changed. Rate limit: 60/min.

### `DELETE /api/receipts/{id}`
Delete the receipt. Rate limit: 60/min.

The UI lives on `/ricevuta` (list + create) and `/ricevuta/{id}` (printable receipt).

---

## 8. Portfolio page

There is no `/api/portfolio` route: `/portfolio` is a server component that builds the
agency presentation from the settings (brand name, tagline, owner, phone, email) and
the search city — change those values in **Impostazioni**. No API call is involved.

---

## 9. Onboarding & first run (`/api/onboarding`)

The app ships with **no personal default city and no default brand**: at first run it
asks the user for their own data and stores it in the settings.

- `GET /api/onboarding` → where the first run stands plus the values already saved:
  ```json
  { "ok": true, "needsOnboarding": true, "values": { "brandName": "", "owner": "", "searchCity": "" } }
  ```
  `needsOnboarding` is `false` as soon as `onboarding_done` exists or a `search_city` is set.
- `POST /api/onboarding` → save the first-run data. Body `{ "brandName"?, "owner"?, "searchCity" }`:
  - `searchCity` is required (max 100 chars); `brandName` and `owner` are optional (max 120).
  - The city is geocoded (Nominatim) and, on success, `search_lat` / `search_lng` are saved too, so later searches need no network call. If geocoding fails the city name is still saved, **without inventing coordinates**.
  - Stores `search_city`, `onboarding_done` and (when provided) `brand_name` / `brand_owner` in a single transaction.
  - Response `{ ok: true, geocoded: true, displayName: "Milano, Lombardia, Italia" }`; validation errors answer `400` with `{ ok: false, errors: { searchCity: "…" } }`.
  - Rate limit: 20/min.
- `POST /api/onboarding` with `{ "skip": true }` → the user does not want the guided
  setup: stores `onboarding_done = "skipped"` and answers `{ ok: true, skipped: true }`.
  The app never asks again.

---

## 10. Notifications (`/api/notifications`)

### `GET /api/notifications?take=50`
```json
{
  "notifications": [
    {
      "id": "...",
      "type": "nuovo_lead",
      "title": "Nuovo lead: Caffè Centrale",
      "message": "Da ricerca OSM",
      "read": false,
      "link": "/crm/cl...",
      "createdAt": "..."
    }
  ],
  "unreadCount": 4
}
```

### `PATCH /api/notifications`
Bulk mark-all-read: `{ markAllRead: true }`.

### `PATCH /api/notifications/:id`
Single item: `{ read: true }`.

### `DELETE /api/notifications/{id}`
Delete one notification.

---

## 11. Email (`/api/email/send`)

Send an email to the address stored on a lead, through SMTP. The recipient always comes from the lead record, never from the request body. With no SMTP host configured the message is written as an `.eml` file under `./tmp/emails` and the response reports `provider: "local-fs"`.

**Body (JSON)**
```json
{
  "leadId": "cl...",
  "subject": "Ciao!",
  "body": "Ciao Alessandro, ...",
  "aiUsed": false
}
```

**Validation:**
- `leadId` must reference an existing lead with an email address (`404` / `400` otherwise).
- `body` is required and sent as plain text; each line is HTML-escaped when the HTML part is built.
- `subject` is optional (a default based on the lead name is used).
- This route does not accept `to`, `replyTo` or attachments.

**Response (200)**
```json
{ "ok": true, "messageId": "<...>", "provider": "smtp|local-fs", "file": "optional .eml path" }
```

**Side effects:** stores a `GeneratedMessage` and an `EmailLog`, adds an `email` activity, and moves a `NUOVO` lead to `CONTATTATO`.

**Rate limit:** 20 emails / minute.

---

## 12. AI helpers (`/api/ai/*`)

AI is optional: with no provider key the app keeps working, and these routes degrade
instead of failing.

- `GET /api/ai/status` → which providers are configured (no key values are returned).
- `POST /api/ai/personalize` → fills a message template with the lead's real data and improves it with the AI. Body `{ leadId, baseText, channel }`, documented in [13](#13-research--discovery).

Keys are read from the settings (Impostazioni) or from `GEMINI_API_KEY` / `GROQ_API_KEY`
in `.env`, with automatic failover between configured providers.

---

## 13. Research / discovery

The area of a search is **never invented**: it is resolved from the request
(`lat`/`lng` or `centers`), from the city you pass (geocoded on the fly with
Nominatim when it has no saved coordinates) or from the settings saved during
onboarding. With nothing configured the route answers `400` instead of searching a
random place, and the `NEXT_PUBLIC_SEARCH_*` environment variables act only as a
deploy override.

- `POST /api/ricerca` → the search behind the `/ricerca` page. Body: `{ categories[], radius_m|radius?, searchCity?, centers?: [{ lat, lng, city }], useAi?, geoapifyMode? }`. Runs OpenStreetMap/Overpass, Geoapify (when configured) and optionally the AI finder, then deduplicates and scores. Response `{ ok, count, candidates, sources: { osm, geoapify, ai }, warnings }`. Rate limit: 15/min.
- `POST /api/leads/{id}/find-website` → looks for the lead's official website, Instagram and Facebook (Gemini + Google Search when a key is configured, otherwise a free DuckDuckGo lookup), checks the URL and saves what it found.
- `POST /api/leads/{id}/enrich` → enriches the lead with the public contacts published on its website: looks the site up when it is missing (free web lookup), downloads the page, extracts the email, the Instagram and the Facebook profile (ignoring share widgets, single posts, login pages and example addresses) and re-checks the site over HTTP. It never overwrites data that is already there and no AI key is required. Response `{ ok, updated[], found, websiteStatus, check, note }`, where `updated` lists exactly which fields changed. `404` when the lead is unknown; rate limit 20/min.
- `POST /api/screenshot` → body `{ leadId, url? }`; captures the homepage with **Playwright** (Chromium) and stores the path on the lead. Requires `npm run setup:screenshot` once and answers `501` when Playwright is not installed. Rate limit: 15/min.
- `POST /api/demo/generate` → generates the lead's demo website. Body `{ leadId, force?, prompt?, locale?, preset?, customPrompt? }`; with `force: false` an already generated site is returned from cache (`{ ok: true, cached: true }`). Rate limit: 8/min.
- `POST /api/cold-call` → builds the cold-call script for a lead (and can improve it with the AI). `GET /api/cold-call?all=1` lists the scripts for the leads that have a phone number.
- `POST /api/ai/personalize` → body `{ leadId, baseText, channel: "whatsapp"|"email" }`; fills the template with the lead's real data and improves it with the AI when a key is configured — `aiUsed` in the response tells you which path ran.

---

## 14. Import / export

- `POST /api/leads/import` → body `{ "rows": [{ "name", "category", "city", "phone", "email", "website", … }] }`. Rows without a name, and duplicates with the same name + city, are skipped; the rest are created. Response `{ ok: true, created, skipped }`. Rate limit: 20/min.
- `GET /api/leads/export` → downloads every lead as CSV (`text/csv`, UTF-8 with BOM so Excel reads accents correctly, filename `lead-export-YYYY-MM-DD.csv`).
- `GET /api/backup` → downloads a versioned JSON export of leads, locations, tags, activities, follow-ups, appointments, templates, generated messages, notifications, settings, receipts, verifications, the verification retry queue, email logs and API-key metadata. Settings whose key ends in `_api_key` or `_pass` are masked, and API-key hashes/secrets are not included. There is no automated restore: keep the JSON and the SQLite file, and restore manually. Rate limit: 10/min.

Every write goes through the same validation helpers as the rest of the API (length bounds, HTML stripped, numbers bounded).

---

## 15. Dashboard / stats

There is **no `/api/stats/*` endpoint**: `/dashboard` and `/report` are React Server
Components that query the database directly, so the numbers are always in sync and
never cached. To read the same data from outside the app use `GET /api/leads/export`,
`GET /api/receipts` or the `/api/v1/*` endpoints.

---

## 16. Message templates (`/api/templates`)

- `GET /api/templates` → list message templates, ordered by channel then creation (`{ ok: true, templates }`).
- `POST /api/templates` → body `{ name, channel, subject?, body, isDefault? }`; `name`, `channel` and `body` are required, `channel` ∈ `whatsapp`, `email`.
- `PATCH /api/templates/{id}` → update the same fields (only the ones you send).
- `DELETE /api/templates/{id}` → delete.

Templates hold the placeholders you reuse when writing to a lead: `src/lib/templates.ts`
fills them with the lead's real data, and `POST /api/ai/personalize` improves the result
with the AI when a provider key is configured.

---

## 17. Errors

Common status codes:

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created (we mostly use 200 for simplicity) |
| `400` | Invalid input — body params failed validation. Response includes `details?: FieldError[]` on complex forms. |
| `404` | Resource not found. |
| `409` | Conflict on idempotent operations. |
| `413` | Payload too large. |
| `422` | Semantically invalid request (rare: most validation problems answer `400`). |
| `429` | Rate-limited. Response headers include `Retry-After` when feasible. |
| `500` | Internal server error. The error is logged server-side; the client only receives `{ error: "Internal server error" }` (never a stack trace in prod). |
| `503` | External dependency unavailable (e.g. no AI provider configured). |

---

## 18. Rate limits summary

| Endpoint group | Limit |
|---|---|
| AI helpers | 15 req/min |
| Email send | 20 req/min |
| Lead create batch | 30 req/min |
| Settings write | 60 req/min |
| Everything else | 300 req/min (very permissive, mainly to stop accidental loops) |

The rate limiter is **in-memory** (per Node.js process). If you scale horizontally or use serverless, replace `src/lib/security.ts#checkRateLimit` with a Redis/Upstash-backed implementation — the function signature is kept small so you can swap it without touching each route.

---

## 19. Public API for external projects (`/api/v1/*`)

This is the **authenticated, CORS-enabled** surface designed to let other
applications (website builders, scripts, automations, AI agents) read and write
Lead Machine data over HTTP.

### 20.1 Creating a key

Go to **Impostazioni → API Key & Integrazioni esterne** in the web UI, or call the admin endpoint from an authenticated session:

```
POST /api/keys          { "name": "My Website Builder" }
→ { ok: true, apiKey: { id, name, keyPrefix, permissions, enabled, createdAt }, rawKey: "lm_live_…" }
```

`rawKey` is returned **only once**. Only its SHA-256 hash is stored in the database. The `/api/keys` admin endpoints require the app session cookie; they are not part of `/api/v1/*` and do not accept an API key.

| Admin endpoint | Method | Purpose |
|---|---|---|
| `/api/keys` | `GET` | List keys (prefix, status, scopes, created, last used — never the secret) |
| `/api/keys` | `POST` | Create a new key |
| `/api/keys/{id}` | `PATCH` | Suspend / reactivate (`enabled`), rename (`name`) or change scopes (`permissions`) |
| `/api/keys/{id}` | `DELETE` | Revoke permanently |

### 20.2 Authentication

Send the key with either header:

```
x-api-key: lm_live_…
Authorization: Bearer lm_live_…
```

| Status | Meaning |
|---|---|
| `401` | Missing, malformed, unknown or revoked key |
| `403` | Key exists but is suspended, **or the key lacks the required scope** |
| `404` | The requested lead / key id does not exist |

Every successful call updates `lastUsedAt` on the key record.

### 20.3 Scopes (per-key permissions)

Each key carries a comma-separated scope list that is **really enforced on every
call** — it is not decorative. Values: `read`, `write`, `search`, `ai`.

| Endpoint | Required scope |
|---|---|
| `GET /api/v1/leads` | `read` |
| `GET /api/v1/leads/{id}` | `read` |
| `POST /api/v1/leads` | `write` |
| `POST /api/v1/search` | `search` |
| `POST /api/v1/demo/generate` | `ai` |

If the scope is missing the API answers `403` with a machine-readable body:

```json
{
  "ok": false,
  "error": "Questa API Key non ha il permesso 'search'. Permessi attuali: [read]. …",
  "requiredScope": "search",
  "currentScopes": ["read"]
}
```

The `X-Required-Scope` response header carries the same value.

#### Ready-made profiles

| Profile | `permissions` | Use case |
|---|---|---|
| Full integration | `read,write,search,ai` | A website builder that needs every capability (must be requested explicitly) |
| Business search | `read,search` | Finds businesses and reads saved leads, cannot modify anything |
| Read only | `read` | Dashboards and reporting, zero write access |
| Insert only | `write` | A form that only creates leads |

If `permissions` is omitted or blank, the key is created **read-only** (`read`).
This is the least-privilege default: `write`, `search` and `ai` must always be
requested explicitly.

Create a key with a profile:

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"Website Builder","permissions":"read,search"}'
```

Change the scopes of an existing key (takes effect immediately, no re-issue):

```bash
curl -X PATCH http://localhost:3000/api/keys/<id> \
  -H "Content-Type: application/json" \
  -d '{"permissions":"read,search,ai"}'
```

`PATCH` also accepts `{"enabled": false}` to suspend a key and `{"name": "…"}` to
rename it. Unknown scope values are rejected with `400`; the raw string is never
stored.

### 20.4 Rate limits

Budgets are counted **per API key**, so several projects can share an IP without
blocking each other. Exceeding a budget returns `429` with `Retry-After` and
`X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset`.

| Scope | Requests |
|---|---|
| `v1:leads:read` | 300 / min |
| `v1:leads:write` | 60 / min |
| `v1:search` | 30 / min |
| `v1:demo:generate` | 15 / min |

### 20.5 CORS

All `/api/v1/*` routes answer preflight `OPTIONS` requests and send:

```
Access-Control-Allow-Origin:  *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key
```

So they can be called straight from a browser on another domain or port.

### 20.6 Endpoints

#### `GET /api/v1/leads` — read saved leads

| Query param | Type | Notes |
|---|---|---|
| `city` | string | Substring match on the city |
| `category` | string | Exact category id (`ristorante`, `panificio`, …) |
| `status` | string | `NUOVO` / `CONTATTATO` / `IN_TRATTATIVA` / `CLIENTE` / `SCARTATO` |
| `hasWebsite` | `true` \| `false` | Filter by web presence |
| `onlyNoWeb` | `1` | Same as `hasWebsite=false` |
| `minScore` | number | Minimum priority score (0–100) |
| `limit` | number | 1–500, default 100 |
| `offset` | number | default 0 |

```bash
curl -H "x-api-key: lm_live_…" \
  "http://localhost:3000/api/v1/leads?hasWebsite=false&city=Milano&limit=25"
```

#### `GET /api/v1/leads/{id}` — single lead

Returns the full record plus the last 20 activities and all its receipts.

#### `POST /api/v1/leads` — create a lead

```json
{ "name": "Osteria Da Mario", "city": "Milano", "category": "ristorante", "phone": "+39 333 1234567" }
```

`name` is the only required field. Returns `201` with the created lead.

#### `POST /api/v1/search` — live territory search

Runs the real OpenStreetMap / Overpass search (plus Geoapify when a key is
configured in Impostazioni). No fake or simulated data is ever returned.

The area is **never invented**: it comes from `lat`/`lng` in the request, from the
`searchCity` you send (geocoded on the fly with Nominatim when it has no saved
coordinates), or from the settings saved during onboarding. When nothing is
configured the route answers `400` with a clear error instead of searching a random
place.

| Field | Type | Default |
|---|---|---|
| `categories` | `string[]` | all categories |
| `lat` / `lng` | number | settings `search_lat` / `search_lng` (deploy override: `.env` `NEXT_PUBLIC_SEARCH_LAT` / `_LNG`) |
| `radius` | number (m) | settings `search_radius_m`, else `5000` |
| `searchCity` | string | settings `search_city` — **there is no built-in default city** |
| `timeoutMs` | number | `45000` (clamped 5000–100000) |

```json
{
  "ok": true,
  "count": 42,
  "area": { "city": "Milano", "lat": 45.4642, "lng": 9.19, "radiusM": 5000 },
  "timedOut": false,
  "warnings": [],
  "leads": [ { "osmId": "node/123", "name": "…", "priorityScore": 82, "priorityReason": "…" } ]
}
```

If the free Overpass mirrors are slow or unreachable, the call still returns
`200` with `timedOut: true` and a human-readable entry in `warnings` instead of
hanging.

#### `POST /api/v1/demo/generate` — AI website for a lead

```json
{ "leadId": "clx…", "force": false, "prompt": "Sottotitolo in dialetto" }
```

Returns `{ ok, provider, html, length }`. With `force: false` an already
generated site is returned from cache (`cached: true`).

Requires an AI key (Gemini or Groq) in Impostazioni. The client automatically
falls back to alternative models if the configured one has been retired by the
provider.

---

## 20. CORS & same-origin

Internal `/api/*` routes are same-origin by default (`next.config.mjs` has no
special CORS headers). If you need to expose one of them to a second origin,
put an authenticating reverse proxy in front. The `/api/v1/*` routes documented
above are already authenticated **and** CORS-enabled out of the box.

---

That's it. For any missing piece or to suggest a new endpoint, open a feature request following [CONTRIBUTING.md](./CONTRIBUTING.md).
