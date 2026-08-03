# Contributing to Lead Machine

First of all: **thank you** for considering contributing to Lead Machine! Every contribution — bug reports, docs, translations, features, tests, design tweaks — makes the project better for everyone.

This document is a quick guide to how the project is organized and how to get your contribution merged. It is intentionally short; if something is unclear, just open an issue and ask.

---

## 1. Code of Conduct

This project adopts the **Contributor Covenant 2.1** (see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)). By participating, you agree to abide by its terms. Be kind, be precise, and assume good faith.

---

## 2. What can I work on?

Anything in this non-exhaustive list is welcome:

- **Bug fixes** — see [issues](https://github.com/lead-machine/lead-machine/issues) with the label `bug`.
- **Security fixes** — please *do not* open a public issue. See [SECURITY.md](./SECURITY.md).
- **i18n / translations** — new languages or improvements to existing ones (it, de, fr, sl, en, es, pt).
- **Accessibility** — we target **WCAG 2.1 AA**. Any improvement toward that goal is highly valued.
- **New modules / features** — open a draft issue describing the problem and your idea *before* starting big work, so we can discuss scope.
- **UI/UX polish** — responsive tweaks, better loading states, keyboard behavior.
- **Performance** — reduce N+1 queries, optimize renders, improve cold start.
- **Tests** — we don't have a test suite yet; any starting point is great.
- **Docs** — the README, inline JSDoc, and this file always need love.

---

## 3. Quick start (dev environment)

```bash
# 1. Clone
git clone https://github.com/lead-machine/lead-machine.git
cd lead-machine

# 2. Install (Node 18.17+ or 20 LTS recommended)
npm install

# 3. Env
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# 4. DB + seed
npm run setup

# 5. Run
npm run dev
# → http://localhost:3000
```

Useful scripts:

| Script | Description |
|---|---|
| `npm run dev` | Next.js dev server with hot reload |
| `npm run build` | Production build (also runs `prisma generate`) |
| `npm start` | Runs the production build |
| `npm run lint` | Lint with `next lint` (ESLint) |
| `npm run typecheck` | Runs `tsc --noEmit` |
| `npm run db:push` | Applies `prisma/schema.prisma` to the SQLite DB |
| `npm run db:seed` | (Re)loads templates and sample data |
| `npm run db:studio` | Opens Prisma Studio in the browser |
| `npm run setup:screenshot` | (Optional) Installs Playwright + Chromium for the screenshot feature |

> **Before opening a PR**, run:
> ```bash
> npm run lint && npm run typecheck
> ```
> and make sure both pass.

---

## 4. Project structure (quick tour)

```
lead-machine/
├── prisma/
│   ├── schema.prisma     # SQLite schema (Lead, Tag, Quote, Notification...)
│   └── seed.ts           # Default templates + sample data
├── public/               # Static assets (logo, icons, screenshots)
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   │   ├── dashboard/
│   │   ├── ricerca/      # Lead search page
│   │   ├── crm/
│   │   ├── preventivi/
│   │   ├── api/          # Every route: GET / POST / PATCH / DELETE
│   │   ├── layout.tsx    # Root layout + providers (theme, i18n)
│   │   └── globals.css   # Tailwind tokens, dark mode, scrollbars, print
│   ├── components/
│   │   ├── ui/           # shadcn-style primitives (Button, Card, Input...)
│   │   ├── dashboard/    # Charts
│   │   ├── app-shell.tsx # Sidebar + header
│   │   ├── locale-provider.tsx  # i18n React context
│   │   ├── locale-switcher.tsx  # Language dropdown
│   │   ├── theme-provider.tsx   # next-themes wrapper
│   │   └── ...
│   └── lib/
│       ├── i18n-config.ts       # Locale metadata (7 locales)
│       ├── i18n-dictionaries.ts # Translations
│       ├── i18n-server.ts       # Server-side i18n helpers
│       ├── security.ts          # Rate limiting + input sanitization
│       ├── prisma.ts
│       ├── settings.ts
│       ├── ai.ts                # Gemini + Groq failover
│       ├── quotes.ts            # Quote/fiscal math (pure functions)
│       ├── scoring.ts           # Lead priority algorithm
│       ├── mailer.ts            # SMTP (nodemailer)
│       ├── utils.ts             # Colors, date/currency formatters (locale-aware)
│       └── ...
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

**Key design principles to keep in mind:**

1. **Local-first.** The app is designed to run on the user's machine with SQLite. Nothing *requires* the cloud. Optional integrations (AI keys, SMTP) should stay optional.
2. **One codebase.** Each new module lives inside the existing folders; we do not split the repo into packages.
3. **Pure helpers where possible.** Business logic (scoring, quote totals, fiscal math) goes into `src/lib/*.ts` as plain functions so it can be unit-tested and reused from server and client.
4. **Locale-aware formatting.** Dates, numbers, currency and distances use the formatter helpers (see `src/lib/utils.ts` and the `useLocale()` hook). Never hardcode `"it-IT"` or `"EUR"` in UI code — read it from locale config.
5. **No secrets to the client.** API keys and passwords are redacted by the settings endpoint (see `GET /api/settings`).
6. **Rate limiting & input validation.** All write-heavy or AI/email endpoints go through the helpers in `src/lib/security.ts`.

---

## 5. Adding / updating translations

Translation dictionaries live in `src/lib/i18n-dictionaries.ts`. Each locale is a flat `key → string` map.

Rules:
- **Keys are ASCII.** Format: `section.subsection.label` (snake_case inside each section allowed).
- **English (`en`) is the reference.** When in doubt, add the new key to `en` first, then fill the others; a missing key falls back to `en`.
- **Variables are `{braced}`** and not interpolated by regex before translate; the helpers replace them.
- Keep the key list alphabetically ordered inside each locale object when feasible, and group them by UI area (`nav.*`, `status.*`, `quote.*`, `actions.*`, etc).

Then add the locale metadata in `src/lib/i18n-config.ts` if it's a **new language**.

---

## 6. Making a pull request

1. **Fork** the repo on GitHub and clone your fork.
2. Create a **feature branch**: `git checkout -b feature/my-thing` or `fix/some-bug`.
3. Make your changes. Commit with descriptive messages (conventional commits welcome, e.g. `feat: add X`, `fix: crash when Y`, `docs(i18n): french updates`).
4. Run `npm run lint && npm run typecheck`. Fix any issue.
5. Push: `git push -u origin feature/my-thing`.
6. Open a **Pull Request** against `main` and fill in the template:
   - **What** is the change (high level summary)?
   - **Why** — link the issue with `Closes #123` if applicable.
   - **How** was it tested (manual steps, browser, OS)?
   - Any **screenshots** if you changed UI (before/after when relevant).
7. Wait for review. We'll be kind. Address comments, push more commits, and we'll squash-merge when green.

### PR size & scope

- Small, focused PRs get merged faster. Split large features into 2–3 smaller ones when possible.
- If a PR touches the DB schema (`prisma/schema.prisma`), always run `npm run db:push` locally and note any migrations or backward-compat concerns.

---

## 7. Commit conventions

We don't enforce a strict format, but something close to **Conventional Commits** is appreciated because it auto-generates nice release notes:

```
feat(crm): allow bulk tag editing
fix(search): dedup by name + city correctly across large batches
docs(readme): add Windows PowerShell setup note
perf(leads): batch existing-osmId lookup (N+1)
i18n(de): complete quote status translations
chore(deps): bump prisma to 5.24
```

---

## 8. Reporting bugs

Use the **Bug report** template and include:

- Environment: OS, Node version (`node -v`), browser.
- Steps to reproduce (a screen recording is great for UI bugs).
- Expected vs actual behavior.
- Console / terminal errors (paste as text inside a code block).
- If it's a build / DB issue, paste the output of `npm run typecheck` and your `.env` **with secrets redacted**.

---

## 9. Questions / help

Stuck? Open a **Discussion** or tag `@maintainers` in your issue and someone will get back to you. No need to be "advanced": we're here to learn together.

<3
