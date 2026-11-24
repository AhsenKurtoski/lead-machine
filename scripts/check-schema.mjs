#!/usr/bin/env node
// ============================================================
// Controllo di allineamento tra le migrazioni D1 e lo schema Prisma.
//
// Il target online del progetto e' Cloudflare Workers + D1, dove il database
// nasce applicando `migrations/*.sql` (wrangler d1 migrations apply). Lo
// sviluppo locale invece usa `prisma db push`, che parte da
// `prisma/schema.prisma`: sono due sorgenti di verita' diverse. Quando
// divergono, le API funzionano in locale e falliscono in produzione con
// "no such column" solo dopo il deploy.
//
// Qui la migrazione viene applicata a un database SQLite temporaneo e
// confrontata con lo schema Prisma tramite `prisma migrate diff`: qualunque
// differenza (tabella, colonna, indice, vincolo) fa fallire il controllo.
//
// Uso: node scripts/check-schema.mjs
// ============================================================
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const MIGRATIONS = path.join(ROOT, "migrations");
const SCHEMA = path.join(ROOT, "prisma", "schema.prisma");
const PRISMA_CLI = path.join(ROOT, "node_modules", "prisma", "build", "index.js");

if (!fs.existsSync(PRISMA_CLI)) {
  console.error("Prisma CLI non trovato in node_modules: esegui `npm ci` prima del controllo.");
  process.exit(1);
}

/** SQL da applicare, in ordine di nome file (0001_init.sql, 0002_....sql). */
const files = fs
  .readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (!files.length) {
  console.error(`Nessuna migrazione .sql in ${path.relative(ROOT, MIGRATIONS)}`);
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lm-schema-"));
const dbFile = path.join(tmpDir, "migration.db");
const dbUrl = pathToFileURL(dbFile).href;

function prisma(args) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
  });
}

try {
  for (const file of files) {
    const applied = prisma([
      "db",
      "execute",
      "--file",
      path.join(MIGRATIONS, file),
      "--url",
      dbUrl,
    ]);
    if (applied.status !== 0) {
      console.error(`La migrazione ${file} non si applica a un database vuoto.`);
      console.error((applied.stderr || applied.stdout || "").trim());
      process.exit(1);
    }
    console.log(`applicata  migrations/${file}`);
  }

  const diff = prisma([
    "migrate",
    "diff",
    "--from-url",
    dbUrl,
    "--to-schema-datamodel",
    SCHEMA,
    "--script",
    "--exit-code",
  ]);

  const script = (diff.stdout || "").trim();
  // Con --exit-code: 0 = nessuna differenza, 2 = differenze, altro = errore.
  if (diff.status === 0) {
    console.log(`allineato  migrations/*.sql == prisma/schema.prisma (${files.length} file)`);
    process.exit(0);
  }

  if (diff.status === 2) {
    console.error("\nLe migrazioni D1 NON corrispondono piu' allo schema Prisma.");
    console.error("Differenze (da applicare come nuova migrazione):\n");
    console.error(script || "(nessun SQL prodotto)");
    console.error(
      "\nAggiungi una migrazione in migrations/ con l'SQL necessario, cosi' il database D1 " +
        "esistente si aggiorna senza perdere dati. Non modificare 0001_init.sql: e' gia' stata applicata."
    );
    process.exit(1);
  }

  console.error("`prisma migrate diff` non e' riuscito:");
  console.error((diff.stderr || diff.stdout || "").trim());
  process.exit(1);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
