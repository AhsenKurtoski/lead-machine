#!/usr/bin/env node
// ============================================================
// Guard rail di igiene (pagine vuote, rotte non dichiarate, residui).
//
// Fallisce quando nel repository o nel database resta qualcosa che non
// dovrebbe esserci piu':
//
//   1. PAGINE VUOTE      — una pagina senza `export default` o senza nessun
//                          elemento JSX (es. un `return null` lasciato li');
//   2. LINK MORTI        — un collegamento interno (`href="/x"`, `router.push`,
//                          `redirect`) che punta a una rotta che non esiste:
//                          succede quando si rimuove un modulo e resta un link;
//   3. ROTTE ORFANE      — una pagina raggiungibile da nessuna parte (ne' menu,
//                          ne' link) e un `layout.tsx` senza `page.tsx`;
//   4. RESIDUI SU DISCO  — cartelle vuote sotto `src/` (es. `src/app/placeholder`);
//   5. RESIDUI NEL DB    — lead e chiavi lasciati dagli smoke test, righe di
//                          verifica orfane o doppie, coda dei rinvii incoerente.
//
// Il confronto con il codice e' diretto: le costanti delle regole (campi ed
// esiti ammessi, tentativi massimi) sono importate dai moduli veri, cosi' il
// guard rail non puo' restare indietro rispetto a `verify.ts`/`verify-queue.ts`.
//
// Uso:
//   node --import tsx scripts/check-hygiene.mjs
//   node --import tsx scripts/check-hygiene.mjs --require-db   (es. dopo gli smoke)
//   HYGIENE_SKIP_DB=1 ...                                      (solo la parte statica)
//
// Eseguito da `npm run qa`. Senza database (CI "app") la parte sui residui nel
// database viene saltata con una riga SKIP, non fallita; con `--require-db`
// invece l'assenza del database e' un errore.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { RETRY_FIELDS, RETRY_MAX_ATTEMPTS } from "../src/lib/verify-queue.ts";
import {
  VERIFICATION_FIELD_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "../src/lib/verify.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");

const REQUIRE_DB = process.argv.includes("--require-db");
const SKIP_DB = process.env.HYGIENE_SKIP_DB === "1";

const problems = [];
const warnings = [];
const skips = [];

function fail(where, why) {
  problems.push({ where, why });
}

function warn(where, why) {
  warnings.push({ where, why });
}

function skip(what, why) {
  skips.push(`${what} -- ${why}`);
  console.log(`SKIP  ${what} -- ${why}`);
}

/** "1 riga" / "3 righe": i conteggi finiscono nei messaggi, meglio scritti bene. */
function count(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// ------------------------------------------------------------
// Utilità sul filesystem
// ------------------------------------------------------------

function walkAllFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
      walkAllFiles(full, out);
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function walkFiles(dir, out = []) {
  for (const full of walkAllFiles(dir, [])) {
    if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

/** Solo i file veri: i test contengono esempi di proposito. */
const sourceFiles = walkFiles(SRC).filter((f) => !/\.test\.tsx?$/.test(f));

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

/** "/crm/[id]" da "crm/[id]" */
function routeOf(segmentDir) {
  const parts = segmentDir.split(/[\\/]/).filter(Boolean);
  return "/" + parts.join("/");
}

/** Il percorso combacia con il pattern della rotta? (`/crm/abc` -> `/crm/[id]`) */
function matchesRoute(target, route) {
  let t = target;
  if (!t.startsWith("/")) t = "/" + t;
  const clean = t.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";
  if (!route.includes("[")) return clean === route;
  const pattern = route
    .split("/")
    .map((seg) => (seg.startsWith("[") ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp("^" + pattern + "$").test(clean);
}

// ------------------------------------------------------------
// 1) Pagine vuote
// ------------------------------------------------------------

const pages = [];
const pageRoutes = [];

function collectPages(dir, segmentDir = "") {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const names = entries.map((e) => e.name);
  if (names.includes("page.tsx")) {
    const file = path.join(dir, "page.tsx");
    pages.push({ file, route: segmentDir ? routeOf(segmentDir) : "/" });
    pageRoutes.push(segmentDir ? routeOf(segmentDir) : "/");
  }
  for (const e of entries) {
    if (e.isDirectory()) collectPages(path.join(dir, e.name), segmentDir ? segmentDir + "/" + e.name : e.name);
  }
}
collectPages(APP);

for (const page of pages) {
  const src = fs.readFileSync(page.file, "utf8");
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\/\/.*$/, ""))
    .join("\n");

  if (!/export\s+default\s/.test(code)) {
    fail(rel(page.file), "la pagina non esporta nessun componente (`export default`)");
    continue;
  }
  // Nessun elemento JSX da nessuna parte: la pagina non disegna nulla. E' il
  // caso di un segnaposto rimasto li' (`return null`), che Next considera una
  // pagina valida e quindi non fa notare in nessun altro modo.
  // Un redirect (o un `notFound()`) invece non disegna per scelta: la home
  // manda a /dashboard senza mostrare niente.
  const hasJsx = /<[A-Za-z][^<>]*>/.test(code) || /<\/[A-Za-z]+>/.test(code);
  const redirects = /\b(redirect|permanentRedirect|notFound)\(/.test(code);
  if (!hasJsx && !redirects) {
    fail(rel(page.file), "la pagina non contiene nessun elemento JSX: non disegna nulla");
  }
}

// ------------------------------------------------------------
// 2) Link morti e 3) rotte orfane
// ------------------------------------------------------------

const apiRoutes = [];
function collectRoutes(dir, segmentDir = "") {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  if (entries.some((e) => e.name === "route.ts")) {
    apiRoutes.push(routeOf(segmentDir));
  }
  for (const e of entries) {
    if (e.isDirectory()) collectRoutes(path.join(dir, e.name), segmentDir ? segmentDir + "/" + e.name : e.name);
  }
}
collectRoutes(APP);

// File speciali che Next genera da codice (non hanno un page.tsx).
const GENERATED_PATHS = ["/robots.txt", "/sitemap.xml"];

// Bersagli interni ammessi anche senza pagina: motivo dichiarato. Se ne aggiungi
// uno, scrivi PERCHE' e' raggiungibile davvero.
const ALLOWED_TARGETS = new Map([
  ["/api/keys", "rotta API creata in Impostazioni per le chiavi"],
]);

// Pagine raggiungibili senza link diretto: motivo dichiarato.
const ALLOWED_ORPHANS = new Map([
  ["/", "la home e' un redirect HTTP a /dashboard (next.config.mjs)"],
  ["/onboarding", "primo avvio: ci si arriva dal redirect dell'app, non da un link"],
]);

const publicDir = path.join(ROOT, "public");
const publicFiles = new Set(
  fs.existsSync(publicDir)
    ? walkAllFiles(publicDir).map((f) => "/" + path.relative(publicDir, f).replace(/\\/g, "/"))
    : []
);

const LINK_PATTERNS = [
  /href\s*[:=]\s*["'](\/[^"']*)["']/g,
  /router\.(?:push|replace)\(\s*["'](\/[^"']*)["']/g,
  /location\.href\s*=\s*["'](\/[^"']*)["']/g,
  /\bredirect\(\s*["'](\/[^"']*)["']/g,
];

const links = new Map(); // target -> file
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const re of LINK_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const target = m[1].split(/[?#]/)[0];
      if (!target.startsWith("/")) continue;
      if (!links.has(target)) links.set(target, rel(file));
    }
  }
}

const navText = fs.readFileSync(path.join(SRC, "components", "app-shell.tsx"), "utf8");
const navHrefs = new Set(Array.from(navText.matchAll(/href:\s*["']([^"']+)["']/g), (m) => m[1]));

for (const href of navHrefs) {
  if (!pageRoutes.some((r) => matchesRoute(href, r))) {
    fail(rel(path.join(SRC, "components", "app-shell.tsx")), `voce di menu senza pagina: ${href}`);
  }
}

for (const [target, file] of links) {
  if (pageRoutes.some((r) => matchesRoute(target, r))) continue;
  if (apiRoutes.some((r) => matchesRoute(target, r))) continue;
  if (publicFiles.has(target)) continue;
  if (GENERATED_PATHS.includes(target)) continue;
  if (ALLOWED_TARGETS.has(target)) continue;
  fail(file, `link a una rotta che non esiste: ${target}`);
}

// Pagine orfane: non nel menu, non linkate. Una pagina che nessuno puo'
// raggiungere e' il residuo tipico di un modulo rimosso a meta'.
const allSourceText = sourceFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const route of pageRoutes) {
  if (navHrefs.has(route)) continue;
  if (ALLOWED_ORPHANS.has(route)) continue;
  const linked = Array.from(links.keys()).some((t) => matchesRoute(t, route));
  if (linked) continue;
  if (route.includes("[")) {
    // Pagine dinamiche: il link e' costruito a pezzi (`"/crm/" + id`), quindi
    // si controlla che il prefisso compaia come stringa nel codice.
    const prefix = route.split("/[").shift() + "/";
    if (allSourceText.includes('"' + prefix) || allSourceText.includes("'" + prefix)) continue;
  }
  fail("src/app", `pagina non raggiungibile da nessuna parte (ne' menu, ne' link): ${route}`);
}

// Layout senza pagina: una rotta che non esiste piu'.
for (const file of walkFiles(SRC)) {
  if (path.basename(file) !== "layout.tsx") continue;
  if (path.dirname(file) === APP) continue; // layout della root: e' l'involucro
  const dir = path.dirname(file);
  if (!fs.existsSync(path.join(dir, "page.tsx"))) {
    fail(rel(file), "layout senza page.tsx: la rotta non esiste (residuo)");
  }
}

// ------------------------------------------------------------
// 4) Residui su disco
// ------------------------------------------------------------

function walkDirs(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (fs.readdirSync(full).length === 0) out.push(full);
    else walkDirs(full, out);
  }
  return out;
}

for (const dir of walkDirs(SRC)) {
  fail(rel(dir) + "/", "cartella vuota: residuo su disco");
}

// ------------------------------------------------------------
// 5) Residui nel database
// ------------------------------------------------------------

function databaseFile() {
  const url = process.env.DATABASE_URL || "";
  const m = url.match(/^file:(.+)$/);
  if (m) {
    const p = m[1].replace(/^\.\//, "");
    return path.isAbsolute(p) ? p : path.join(ROOT, "prisma", p);
  }
  return path.join(ROOT, "prisma", "dev.db");
}

async function checkDatabase() {
  const dbFile = databaseFile();
  if (SKIP_DB) {
    skip("residui nel database", "HYGIENE_SKIP_DB=1");
    return;
  }
  if (!fs.existsSync(dbFile)) {
    if (REQUIRE_DB) {
      fail(rel(dbFile), "database richiesto (--require-db) ma assente: esegui `npm run setup`");
      return;
    }
    skip("residui nel database", `nessun database in ${rel(dbFile)}`);
    return;
  }

  const require_ = createRequire(import.meta.url);
  const { PrismaClient } = require_("@prisma/client");
  const prisma = new PrismaClient();

  // I marker degli smoke test si leggono dallo script che li crea: se cambiano
  // li', cambia anche il guard rail.
  const smokeSrc = fs.readFileSync(path.join(ROOT, "scripts", "smoke-api.mjs"), "utf8");
  const leadMarker = (smokeSrc.match(/const TEST_LEAD_NAME\s*=\s*"([^"]+)"/) || [])[1] || "Smoke Test";
  const keyPrefix = (smokeSrc.match(/name\.startsWith\("([^"]+)"\)/) || [])[1] || "smoke-";

  try {
    const dbProblemsBefore = problems.length;
    const problemCount = () => problems.length - dbProblemsBefore;

    // 5a) Quello che gli smoke test creano e devono ripulire da soli.
    const testLeads = await prisma.lead.findMany({
      where: { name: { contains: leadMarker } },
      select: { id: true, name: true },
    });
    if (testLeads.length) {
      fail(
        rel(dbFile),
        `${count(testLeads.length, "lead di test", "lead di test")} non ripuliti (${leadMarker}): la pulizia degli smoke test non ha funzionato`
      );
    }

    const keys = await prisma.apiKey.findMany({ select: { name: true } });
    const testKeys = keys.filter((k) => k.name.startsWith(keyPrefix));
    if (testKeys.length) {
      fail(
        rel(dbFile),
        `${count(testKeys.length, "chiave API di test", "chiavi API di test")} non ripulite (${keyPrefix}…)`
      );
    }

    // 5b) Righe di verifica senza lead: la cascata le cancella, se restano il
    //     database e' incoerente.
    for (const table of ["Verification", "VerificationRetry"]) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS c FROM ${table} t LEFT JOIN Lead l ON l.id = t.leadId WHERE l.id IS NULL`
      );
      const orphans = Number(rows[0]?.c ?? 0);
      if (orphans > 0) {
        fail(rel(dbFile), `${count(orphans, "riga", "righe")} di ${table} senza lead (orfane)`);
      }
    }

    // 5c) Una sola fotografia per lead e campo: il runner cancella la
    //     precedente prima di riscrivere, quindi i doppioni sono un residuo.
    const duplicates = await prisma.$queryRawUnsafe(
      "SELECT leadId, field, COUNT(*) AS c FROM Verification GROUP BY leadId, field HAVING c > 1"
    );
    if (duplicates.length) {
      const detail = duplicates
        .slice(0, 3)
        .map((d) => `${d.leadId}/${d.field} x${Number(d.c)}`)
        .join(", ");
      fail(
        rel(dbFile),
        `${count(duplicates.length, "fotografia doppia", "fotografie doppie")} per lo stesso campo (${detail}): rileggi il lead con "Verifica ora"`
      );
    }

    // 5d) Valori che il codice non scrive piu' (esito, campo) o coda fuori regola.
    const verifications = await prisma.verification.findMany({
      select: { field: true, status: true },
    });
    const badField = verifications.filter((v) => !(v.field in VERIFICATION_FIELD_LABELS));
    const badStatus = verifications.filter((v) => !(v.status in VERIFICATION_STATUS_LABELS));
    if (badField.length) {
      fail(
        rel(dbFile),
        `${count(badField.length, "riga di verifica", "righe di verifica")} con un campo sconosciuto: ${badField[0].field}`
      );
    }
    if (badStatus.length) {
      fail(
        rel(dbFile),
        `${count(badStatus.length, "riga di verifica", "righe di verifica")} con un esito sconosciuto: ${badStatus[0].status}`
      );
    }

    const queued = await prisma.verificationRetry.findMany({
      select: { field: true, attempts: true, nextAttemptAt: true, reason: true },
    });
    const unknownField = queued.filter((q) => !RETRY_FIELDS.includes(q.field));
    if (unknownField.length) {
      fail(
        rel(dbFile),
        `${count(unknownField.length, "controllo", "controlli")} in coda per campi che non si riprovano: ${unknownField[0].field}`
      );
    }
    const impossible = queued.filter((q) => q.attempts < 1 || q.attempts >= RETRY_MAX_ATTEMPTS);
    if (impossible.length) {
      fail(
        rel(dbFile),
        `${count(impossible.length, "controllo", "controlli")} in coda con tentativi fuori regola (1..${RETRY_MAX_ATTEMPTS - 1}): la coda non li ha scaricati`
      );
    }
    const overdue = queued.filter((q) => q.nextAttemptAt.getTime() < Date.now() - 24 * 3_600_000);
    if (overdue.length) {
      warn(
        rel(dbFile),
        `${count(overdue.length, "controllo", "controlli")} in coda con piu' di un giorno di ritardo: l'app li riprova al prossimo avvio`
      );
    }

    if (problemCount() === 0) {
      console.log(
        `Database ok: nessun residuo degli smoke test, nessuna riga di verifica orfana o doppia ` +
          `(${verifications.length} verifiche, ${queued.length} controlli in coda).`
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    fail(
      rel(dbFile),
      `database illeggibile o non allineato allo schema (${message}): esegui \`npm run setup\``
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

await checkDatabase();

// ------------------------------------------------------------
// Esito
// ------------------------------------------------------------

for (const w of warnings) {
  console.log(`WARN  ${w.where}: ${w.why}`);
}

if (problems.length === 0) {
  const skipped = skips.length ? `, controlli saltati: ${skips.length}` : "";
  console.log(
    `Igiene ok: ${pages.length} pagine piene e raggiungibili, ${apiRoutes.length} rotte API, nessun residuo su disco${skipped}.`
  );
  process.exit(0);
}

console.error(`Residui trovati: ${problems.length}\n`);
for (const p of problems) {
  console.error(`  ${p.where}: ${p.why}`);
}
process.exit(1);
