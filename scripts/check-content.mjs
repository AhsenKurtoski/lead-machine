#!/usr/bin/env node
// ============================================================
// Cancello sui contenuti (Fase 1).
//
// Impedisce che rientrino nell'app:
//   1. il modulo preventivi/listino che e stato rimosso di proposito;
//   2. le diciture fiscali (partita IVA, aliquote, ritenute, bollo);
//   3. qualsiasi riferimento a eta / adulti / minori.
//
// Uso: node scripts/check-content.mjs   (exit 1 se trova qualcosa)
// Eseguito da `npm run qa`, quindi anche in CI.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".kilo", ".omo", ".codegraph"]);

/** Regole sul CODICE: identificatori del modulo rimosso. */
const CODE_RULES = [
  { re: /prisma\.quote\b/i, why: "usa il modello Quote rimosso (ora c'e Receipt)" },
  { re: /["'`]\/api\/quotes/i, why: "chiama l'API /api/quotes rimossa" },
  { re: /nav\.quotes|nav\.pricelist/i, why: "voce di menu del modulo rimosso" },
  { re: /price-estimator|quote-send-actions|lib\/quotes/i, why: "file del modulo rimosso" },
  { re: /quoteTotalFromRaw|generateQuoteNumber|QuoteSendActions/i, why: "helper del modulo rimosso" },
  { re: /^\s*model Quote\b/m, why: "modello Quote nello schema Prisma" },
];

/** Regole sul TESTO visibile: fiscale ed eta. */
const TEXT_RULES = [
  { re: /partita\s+IVA/i, why: "dicitura fiscale" },
  { re: /\bP\.\s?IVA\b/i, why: "dicitura fiscale" },
  { re: /aliquot/i, why: "dicitura fiscale" },
  { re: /marca da bollo/i, why: "dicitura fiscale" },
  { re: /ritenuta/i, why: "dicitura fiscale" },
  { re: /minorenn|maggiorenn/i, why: "riferimento all'eta" },
  { re: /\badult[oi]\b/i, why: "riferimento all'eta" },
];

/**
 * Rimuove i commenti prima di ispezionare il testo.
 * Serve perche un commento puo spiegare cosa NON contiene il file
 * (es. "nessuna aliquota, nessuna partita IVA") senza essere un residuo.
 * Il testo visibile all'utente resta invece controllato per intero.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const i = line.indexOf("//");
      return i === -1 ? line : line.slice(0, i);
    })
    .join("\n");
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|prisma|js|mjs)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];

// 1) Codice: src/ + prisma/schema.prisma (i test sono esclusi: contengono
//    di proposito gli elenchi di parole vietate per verificarle).
const codeFiles = walk(path.join(ROOT, "src")).filter((f) => !/\.test\.tsx?$/.test(f));
const schema = path.join(ROOT, "prisma", "schema.prisma");
if (fs.existsSync(schema)) codeFiles.push(schema);

for (const file of codeFiles) {
  const text = stripComments(fs.readFileSync(file, "utf8"));
  for (const rule of CODE_RULES) {
    if (rule.re.test(text)) {
      violations.push({ file: path.relative(ROOT, file), why: rule.why });
    }
  }
}

// 2) Testo visibile: src/ (senza test) + documentazione principale.
const textFiles = codeFiles.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
for (const name of ["README.md", "CONTRIBUTING.md"]) {
  const p = path.join(ROOT, name);
  if (fs.existsSync(p)) textFiles.push(p);
}
const docsDir = path.join(ROOT, "docs");
if (fs.existsSync(docsDir)) {
  for (const f of fs.readdirSync(docsDir)) {
    if (f.endsWith(".md")) textFiles.push(path.join(docsDir, f));
  }
}

for (const file of textFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const text = file.endsWith(".md") ? raw : stripComments(raw);
  for (const rule of TEXT_RULES) {
    if (rule.re.test(text)) {
      violations.push({ file: path.relative(ROOT, file), why: rule.why });
    }
  }
}

if (violations.length === 0) {
  console.log(`Contenuti ok: nessun residuo commerciale/fiscale/di eta (${codeFiles.length} file di codice, ${textFiles.length} di testo).`);
  process.exit(0);
}

console.error(`Contenuti NON ammessi: ${violations.length}\n`);
for (const v of violations) {
  console.error(`  ${v.file}: ${v.why}`);
}
process.exit(1);
