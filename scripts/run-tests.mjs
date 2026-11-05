#!/usr/bin/env node
// ============================================================
// Runner dei test unitari (node:test + tsx, zero dipendenze extra)
//
// Scopre i file *.test.ts/*.test.tsx sotto src/ ed esegue il test runner
// nativo di Node. Non usa i glob della shell: l'espansione dei glob cambia
// tra Windows (cmd.exe) e Linux, e Node 20 (versione usata in CI) non
// espande i pattern passati a `--test`.
// ============================================================
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SRC = resolve(process.cwd(), "src");
const files = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full);
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
}

walk(SRC);
files.sort();

if (files.length === 0) {
  console.error(`Nessun file di test (*.test.ts) trovato sotto ${relative(process.cwd(), SRC)}`);
  process.exit(1);
}

const shown = files.map((f) => relative(process.cwd(), f).replace(/\\/g, "/"));
console.log(`Test unitari: ${files.length} file\n  ${shown.join("\n  ")}\n`);

// `--import tsx` abilita il transpile TypeScript nei processi figli del runner.
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { stdio: "inherit", cwd: process.cwd() }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
