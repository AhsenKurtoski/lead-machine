# Security Policy

Lead Machine is developed with a strong focus on defense-in-depth for a **self-hosted / local-first** application. Even though the default deployment runs on a user's laptop with SQLite, we treat security seriously and will respond quickly to confirmed vulnerabilities.

## Supported Versions

Only the **latest release on the `main` branch** (and the current npm-tagged version on `main`) is actively supported with security patches. If you're running an older version, please upgrade first.

| Version | Supported |
| --- | --- |
| `1.0.x` (current) | ✅ |
| `< 1.0` | ❌ |

## Reporting a Vulnerability

**Please do not file a public GitHub issue.** Public disclosure can put users at risk. Instead:

1. E-mail the maintainers at: **`security@lead-machine.dev`** (PGP key available on request).
2. Include:
   - A short, high-level description of the issue.
   - Steps to reproduce (a minimal script + repo state is ideal).
   - Impact (who is affected, worst case).
   - Your environment: Node version, OS, browser if web UI.
3. You will receive an acknowledgment within **48 hours**, and a more detailed response within 5 working days with:
   - Confirmation of the bug or reason it's not considered a vulnerability.
   - A timeline for patching.
   - A CVE / advisory plan, if applicable.

We follow a 90-day disclosure window where feasible (fixes first, then coordinated disclosure). Credit is always given in the release notes unless you explicitly ask to stay anonymous.

## Scope

What is in scope:
- Server and client code in this repo (`src/`, API routes, Prisma schema, seed).
- Default configuration (`.env.example`, `next.config.mjs`).
- i18n and formatting logic, if exploitable (injection, XSS via template).
- Optional integrations: Playwright screenshot, nodemailer SMTP, AI providers (Gemini / Groq).

What is usually **out of scope**:
- Attacks that require **local code execution** (e.g., editing `prisma/dev.db` directly) — the app trusts the local filesystem by design.
- Vulnerabilities only present in **third-party services** (Groq, Gemini, Geoapify, OSM). We will bump / pin dependencies but the root issue is upstream.
- Phishing / social engineering against end-users of the freelancer using the tool.
- Denial-of-service that requires a running server exposed to the internet *without* a reverse proxy in front (the default setup expects localhost use).

## General hardening guidance

For deployments that go beyond `localhost`, follow `DEPLOY.md` and, in addition:

1. **Put authentication in front.** This app does not ship user/login (it's single-user by design). If you expose it publicly, add a proxy with Basic Auth, a Vercel/Cloudflare Access policy, or a small auth layer in front.
2. **Rotate secrets.** Never commit `.env`. Rotate `GROQ_API_KEY`, `GEMINI_API_KEY`, and SMTP passwords periodically.
3. **Restrict the DB file.** Set filesystem ACLs on `prisma/dev.db` so only the runtime user can read it.
4. **Keep dependencies up to date.** We provide Dependabot config; enable it on your fork.
5. **Disable optional modules you don't use.** If you don't need screenshots, don't install Playwright (reduces attack surface).

## Security-Related Layers Already in the Codebase

A quick reference for auditors:

| Layer | Where | What |
|---|---|---|
| Rate limiting (in-memory, per-IP+UA fingerprint) | `src/lib/security.ts` → `rateLimitedResponse` | Applied to writes, AI, email, lead import. |
| Input type/size coercion | `src/lib/security.ts` → `asString`, `asNumber`, `sanitizePlainText`, `isValidEmail`, `normalizeUrl` | Used on every API route body field we care about. |
| HTML escape for emails / exports | `escapeHtml` in `security.ts` and `email/send/route.ts` | Prevents stored XSS via lead data when rendering an HTML email body. |
| Secrets redaction on settings GET | `api/settings/route.ts` | `*_api_key` and `*_pass` returned as `••••••••` over HTTP; masked values are rejected on write (no accidental wipe). |
| Whitelist for settings keys | `ALLOWED_KEYS` in `api/settings/route.ts` | Arbitrary key injection blocked; regex + max length. |
| Prisma parameterized queries | Everywhere via Prisma client | SQL injection surface removed by ORM. |
| Prepared statements + transactions for atomic writes | `prisma.$transaction(...)` in lead import, settings bulk-upsert, etc. | Prevent partial writes. |
| Safe navigation on `req.json()` | `await req.json().catch(() => ({}))` + typed wrappers | Malformed JSON can't crash handlers. |
| `next/images` domain wildcard with `next.config.mjs` | `remotePatterns` allowlist (`http*://**`) | Lead websites render through `next/image` (already behind fetch, no SSRF on static images via `next/image`; for the Playwright screenshot route, only user-clicked URLs are fetched). |
| CSRF on same-origin | All state-changing endpoints use POST/PATCH/DELETE + JSON | Avoids many forms of CSRF; a future layer can add a token for public-facing installs. |

If you spot a gap in any of these, please report it using the process above.
