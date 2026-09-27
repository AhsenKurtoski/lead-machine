# Lead Machine — REST API Reference

All API routes live under `/api/*` and serve the single-user app that runs on `localhost:3000` (or wherever you deploy it). Most routes accept JSON and return JSON. Errors return `{ error: "…" }` with an appropriate HTTP status.

> **Note on auth**: By design the app has **no built-in multi-user auth** — it's a personal tool. If you expose it publicly, **put an authenticating reverse proxy in front** (HTTP Basic, Vercel/Cloudflare Access, or add your own session layer).

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
    "company_city": "Feltre",
    "company_address": "Via Roma, 1",
    "company_website": "https://example.com",
    "default_city": "Feltre, Italia",
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
List leads with optional filters.

**Query params**
| Param | Type | Default | Description |
|---|---|---|---|
| `take` | int | 2000 | Cap on rows returned. |
| `skip` | int | 0 | Offset for pagination. |
| `status` | string | — | Filter by exact `status` (`NUOVO`, `CONTATTATO`, `INTERESSATO`, `PREVENTIVO`, `CONVERTITO`, `PERSO`, `NON_TROVATO`, `VERIFICA`). |
| `q` | string | — | Substring search on `name`, `email`, `phone`, `city`, `category`. |
| `tag` | string | — | Only leads that have this tag name (join on `LeadTag`). |
| `minScore` | int (0–100) | — | Filter by lead priority score. |
| `sort` | `score|createdAt|lastContactAt|name` | `score` | Sort column. |
| `dir` | `asc\|desc` | `desc` | Sort direction. |

**Response (200)**
```json
{
  "leads": [
    {
      "id": "cl...",
      "osmId": "n123",
      "name": "Caffè Centrale",
      "category": "Bar/Caffè",
      "city": "Feltre",
      "email": "info@caffe...",
      "phone": "+39 0439...",
      "website": "https://...",
      "latitude": 46.02,
      "longitude": 11.90,
      "status": "NUOVO",
      "score": 72,
      "createdAt": "2026-01-01T...",
      "lastContactAt": null,
      "tags": ["bar", "wifi"]
    }
  ],
  "total": 120
}
```

### `POST /api/leads`
Create or update (upsert) a batch of leads. Deduplicates internally by `osmId` first, then by `(name, city)`, then inserts the rest in a Prisma `$transaction` so each successful lead also gets a `NUOVO_LEAD` notification atomically.

**Body (JSON)**
```json
{
  "leads": [
    {
      "osmId": "n999",
      "name": "Pizzeria Da Nino",
      "category": "Ristorante",
      "city": "Feltre",
      "address": "Via Mezzaterra, 12",
      "latitude": 46.02,
      "longitude": 11.91,
      "phone": "+39 0439...",
      "email": "nino@example.com",
      "website": "https://example.com",
      "hasWifi": true
    }
  ]
}
```

**Validation:**
- `latitude`/`longitude`: bounded to Earth ±90 / ±180, coerced with 6-digit precision.
- All strings: trimmed, length bounded, sanitized HTML removed.
- Batch size: cap at 200 records per call.

**Response (200)**
```json
{
  "created": 3,
  "updated": 0,
  "skippedDedup": 2,
  "errors": 0
}
```

**Rate limit:** 30 requests / minute per IP+UA (batch-aware, not per-record).

---

### `GET /api/leads/[id]`
Fetch one lead with full nested relations: `tags`, `appointments`, `activities`, `quotes` (with `items` and `followUps`), and a computed `nextFollowUp`.

**Response (200)**
```json
{
  "lead": {
    "id": "cl...",
    "name": "...",
    "...": "...",
    "tags": [...],
    "appointments": [...],
    "activities": [...],
    "quotes": [
      {
        "id": "cl...",
        "number": "2026/0001",
        "status": "BOZZA",
        "total": 180000,
        "items": [...]
      }
    ],
    "nextFollowUp": {
      "id": "...",
      "dueAt": "2026-02-01T10:00:00.000Z",
      "status": "PENDING"
    }
  }
}
```

### `PATCH /api/leads/[id]`
Update one lead. Body is a partial Lead object (same fields as `POST /api/leads`). Setting `status` to `CONTATTATO` automatically bumps `lastContactAt` to now.

### `DELETE /api/leads/[id]`
Hard-delete one lead (cascades tags, appointments, activities, quotes, invoices, follow-ups, notifications via Prisma `onDelete: Cascade`).

---

### `DELETE /api/leads/bulk`
Delete or update many leads by ID.

**Body (JSON, delete)**
```json
{ "ids": ["cl1...", "cl2..."], "action": "delete" }
```

**Body (JSON, set status)**
```json
{ "ids": ["cl1...", "cl2..."], "action": "setStatus", "status": "CONTATTATO" }
```

**Body (JSON, add/remove tag)**
```json
{ "ids": ["cl1...", "cl2..."], "action": "addTag", "tag": "calda" }
```

---

## 3. Tags (`/api/tags`)

- `GET /api/tags` → list all tag names with lead counts (e.g. `[{ name: "calda", count: 7 }]`).
- `POST /api/tags` → body `{ name }` creates a tag (idempotent).
- `DELETE /api/tags/:name` → removes the tag from every lead.

---

## 4. Appointments (`/api/appointments`)

- `GET /api/appointments?from=&to=&leadId=` → list appointments in a range (ISO strings).
- `POST /api/appointments` → create. Body: `{ leadId, title, description?, startsAt, location?, color? }`.
- `PATCH /api/appointments/:id` → update.
- `DELETE /api/appointments/:id` → delete.

### `GET /api/appointments/:id/ics`
Returns an `text/calendar` `.ics` file for a single appointment. Import directly into Google Calendar / Outlook / Apple Calendar.

---

## 5. Activities (`/api/activities`)

- `GET /api/activities?leadId=&take=200` → list activities.
- `POST /api/activities` → body `{ leadId, type, title, description?, outcome?, durationMinutes? }`.
  - `type` ∈ `CHIAMATA`, `EMAIL`, `WHATSAPP`, `RIUNIONE`, `APPUNTAMENTO`, `NOTE`, `RICERCA`, `ALTRO`.
- `PATCH /api/activities/:id`, `DELETE /api/activities/:id`.

---

## 6. Quotes (`/api/quotes`)

- `GET /api/quotes?leadId=&status=` → list.
- `POST /api/quotes` → create a new quote with items. Body:
  ```json
  {
    "leadId": "cl...",
    "title": "Sviluppo sito vetrina",
    "validityDays": 30,
    "paymentTerms": "RM01",
    "vatRate": 22,
    "items": [
      { "description": "Analisi e progettazione", "quantity": 1, "unitPrice": 50000 },
      { "description": "Design UI (6 pagine)", "quantity": 6, "unitPrice": 15000 }
    ],
    "notes": "..."
  }
  ```
  All money is stored in **cents** of the selected currency (never floats).
- `PATCH /api/quotes/:id` → update (including status workflow).
  Status flow is `BOZZA` → `INVIATO` → `ACCETTATO` → `FATTURATO` (or `RIFIUTATO`, `ANNULLATO`).
- `DELETE /api/quotes/:id` → delete with items.

### Quote follow-ups (`/api/quotes/:id/followups`)
- `POST` → body `{ dueAt, title?, note?, channel? }`.
- `PATCH /api/followups/:id` → update status (`PENDING` → `DONE` / `SKIPPED`).
- `DELETE /api/followups/:id`.

### `GET /api/quotes/:id/pdf`
Returns the rendered PDF of a quote via `react-pdf`. All text inserted by the user (lead name, item descriptions, notes) is HTML-escaped before rendering.

### `POST /api/quotes/:id/send`
Sends the quote PDF by email using the configured SMTP (or logs to `/tmp` / console if no SMTP is set — great for local testing).

Body:
```json
{ "to": "client@example.com", "subject": "Preventivo 2026/0001", "message": "..." }
```

### `GET /api/quotes/export?format=csv|json`
Export all quotes (JSON by default).

---

## 7. Invoices (`/api/invoices`)

Analogous to quotes but for invoices. See `/src/app/api/invoices/*` for the exact schema.

- `GET /api/invoices`
- `POST /api/invoices` (can be created from a `quoteId`).
- `GET /api/invoices/:id/pdf`
- `POST /api/invoices/:id/send`
- `PATCH /api/invoices/:id` (mark paid with `paidAt` date, etc).

---

## 8. Portfolio items (`/api/portfolio`)
Simple CRUD for the portfolio showcase grid shown on `/portfolio`.

- `GET`, `POST`, `PATCH`, `DELETE`. Body: `{ title, client?, year?, description?, tech[], imageUrl?, liveUrl?, repoUrl? }`.

---

## 9. Price list (`/api/pricelist`)
CRUD for service packages shown on `/listino`.

- `GET`, `POST`, `PATCH`, `DELETE`. Body: `{ code, name, category?, basePrice, description?, included[] }`.

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

### `DELETE /api/notifications/read`
Wipe every read notification (cleanup).

---

## 11. Email (`/api/email/send`)

Send a transactional email through SMTP. Falls back to writing `.eml` files to `./tmp/emails` **and** logging to the console if no SMTP host is configured (safe local testing).

**Body (JSON)**
```json
{
  "to": "client@example.com",
  "subject": "Ciao!",
  "bodyHtml": "<p>Ciao <b>Alessandro</b>, ...</p>",
  "bodyText": "Ciao Alessandro, ...",
  "replyTo": "me@miaazienda.it",
  "attachments": [{ "filename": "preventivo.pdf", "contentBase64": "..." }]
}
```

**Validation:**
- `to` and `replyTo` (if set) are validated by `isValidEmail`.
- `bodyHtml` is **escaped on every interpolated user variable** by the callers (see `src/lib/mailer.ts`).
- `bodyText` is required (plain-text fallback).

**Response (200)**
```json
{ "ok": true, "messageId": "<...>", "provider": "smtp|local-fs" }
```

**Rate limit:** 20 emails / minute.

---

## 12. AI helpers (`/api/ai/*`)

- `POST /api/ai/call-script` → Generates a cold-call elevator pitch for a lead. Uses the `lead.category`, `lead.city` and default company settings.
  - Body: `{ leadId }`
  - **Failover behavior:** tries Groq first, then Gemini if the first fails or is not configured; returns 503 if neither provider has an API key.
  - **Rate limit:** 15 / minute.
- `POST /api/ai/email-draft` → Draft a follow-up email given an `activityId` or `leadId` + optional `context`.
- `POST /api/ai/lead-score` → Recomputes a single lead's score (the cron-equivalent; normally scores are set on import). Returns `{ score, reasons: string[] }`.

All AI routes mask prompts and responses from access logs where possible.

---

## 13. Research / discovery

### `POST /api/search/overpass`
Finds businesses on **OpenStreetMap Overpass API** inside a radius (meters) around a center (lat, lng). Returns raw JSON; the UI then sends it to `POST /api/leads` to persist.

**Body**
```json
{
  "query": "bar,restaurant",
  "city": "Feltre",
  "latitude": 46.020,
  "longitude": 11.903,
  "radius": 5000
}
```

### `GET /api/search/website/:leadId`
Runs the "website finder" pipeline for a single lead (DNS → HTTPS probe → parse homepage → extract email/phone/social). Cache is controlled by `maxAgeDays` query param.

### `POST /api/search/website/bulk`
Same as above, for an array of `leadIds`. Results are streamed by client polling `GET /api/search/website/:leadId` status, or returned in the same response for small batches.

### `GET /api/search/screenshot/:leadId`
Takes a screenshot of the lead's homepage with **Playwright** (Chromium). Requires `npm run setup:screenshot` to be run once.

Returns a PNG with `Cache-Control: public, max-age=86400`.

---

## 14. Import / export

- `POST /api/import/csv` → body is multipart/form-data `file=<csv>` with column matching.
- `GET /api/leads/export?format=csv|json` → download all leads.
- `GET /api/activities/export?format=csv|json` → download activities.

CSV imports respect the same whitelist / sanitization rules as direct writes. Invalid rows are reported per-row (row index + errors) without aborting the entire batch (default max-bad-rows: 20%).

---

## 15. Dashboard / stats

- `GET /api/stats/summary` → Returns the widgets on `/dashboard`:
  ```json
  {
    "totals": { "leads": 120, "nuovi": 42, "contattati": 80, "convertiti": 9, "persi": 11, "quotes": 21, "revenue": 4200000 },
    "byMonth": [{ "month": "2026-01", "leads": 30, "quotes": 4, "revenue": 900000 }],
    "byStatus": [{ "status": "NUOVO", "count": 42 }],
    "heatmap": [{ "dow": 1, "hour": 9, "count": 4 }],
    "byCity": [{ "city": "Feltre", "count": 34 }],
    "byTag": [{ "name": "calda", "count": 7 }],
    "top": [{ "id": "...", "name": "Caffè Centrale", "score": 96 }],
    "funnel": [{ "stage": "NUOVO", "count": 42, "value": 0 }]
  }
  ```
- `GET /api/stats/report` → Report/analytics page (same shape, extra filters `?from=&to=`).

---

## 16. Default templates

Quote templates, invoice templates, and cold-call scripts can be seeded via `prisma/seed.ts`. They are surfaced through regular CRUD routes under `/api/templates/*` (if present) — see `prisma/schema.prisma` for the full model.

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
| `422` | Semantically invalid (e.g. invoice from a quote that's not ACCETTATO). |
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

## 20. Public API for external projects (`/api/v1/*`)

This is the **authenticated, CORS-enabled** surface designed to let other
applications (website builders, scripts, automations, AI agents) read and write
Lead Machine data over HTTP.

### 20.1 Creating a key

Go to **Impostazioni → API Key & Integrazioni esterne** in the web UI, or call:

```
POST /api/keys          { "name": "My Website Builder" }
→ { ok: true, apiKey: { id, name, keyPrefix, permissions, enabled, createdAt }, rawKey: "lm_live_…" }
```

`rawKey` is returned **only once**. Only its SHA-256 hash is stored in the database.

| Admin endpoint | Method | Purpose |
|---|---|---|
| `/api/keys` | `GET` | List keys (prefix, status, created, last used — never the secret) |
| `/api/keys` | `POST` | Create a new key |
| `/api/keys/{id}` | `PATCH` | Enable / suspend a key (`{ "enabled": false }`) |
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
| `403` | Key exists but is suspended |

Every successful call updates `lastUsedAt` on the key record.

### 20.3 CORS

All `/api/v1/*` routes answer preflight `OPTIONS` requests and send:

```
Access-Control-Allow-Origin:  *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key
```

So they can be called straight from a browser on another domain or port.

### 20.4 Endpoints

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
  "http://localhost:3000/api/v1/leads?hasWebsite=false&city=Feltre&limit=25"
```

#### `GET /api/v1/leads/{id}` — single lead

Returns the full record plus the last 20 activities and all quotes.

#### `POST /api/v1/leads` — create a lead

```json
{ "name": "Osteria Da Mario", "city": "Feltre", "category": "ristorante", "phone": "+39 333 1234567" }
```

`name` is the only required field. Returns `201` with the created lead.

#### `POST /api/v1/search` — live territory search

Runs the real OpenStreetMap / Overpass search (plus Geoapify when a key is
configured in Impostazioni). No fake or simulated data is ever returned.

| Field | Type | Default |
|---|---|---|
| `categories` | `string[]` | all categories |
| `lat` / `lng` | number | from `.env` (`NEXT_PUBLIC_SEARCH_LAT` / `_LNG`) |
| `radius` | number (m) | `5000` |
| `searchCity` | string | `Feltre` |
| `timeoutMs` | number | `45000` (clamped 5000–100000) |

```json
{
  "ok": true,
  "count": 42,
  "area": { "city": "Feltre", "lat": 46.0172, "lng": 11.9069, "radiusM": 5000 },
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

## 19. CORS & same-origin

Internal `/api/*` routes are same-origin by default (`next.config.mjs` has no
special CORS headers). If you need to expose one of them to a second origin,
put an authenticating reverse proxy in front. The `/api/v1/*` routes documented
above are already authenticated **and** CORS-enabled out of the box.

---

That's it. For any missing piece or to suggest a new endpoint, open a feature request following [CONTRIBUTING.md](./CONTRIBUTING.md).
