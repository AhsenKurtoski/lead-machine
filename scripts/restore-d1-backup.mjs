#!/usr/bin/env node
// ============================================================
// Ripristino di un backup D1 prodotto da `npm run backup:d1`.
//
// Accetta sia un dump in chiaro (`.sql`) sia un backup cifrato (`.sql.enc`):
// in quest'ultimo caso serve la stessa passphrase usata per crearlo
// (`LEAD_MACHINE_BACKUP_PASSPHRASE`). Il file decifrato vive in una cartella
// temporanea e viene cancellato a fine corsa.
//
// Il dump contiene schema, dati e tabella `d1_migrations`: va importato in un
// database VUOTO. Importarlo sopra un database già migrato fallisce (ed è
// giusto che fallisca): non è un merge.
//
// Uso:
//   LEAD_MACHINE_BACKUP_PASSPHRASE=... node scripts/restore-d1-backup.mjs --file backup.sql.enc --local
//   ... --remote --yes        (il ripristino remoto è distruttivo: richiede --yes)
//
// Opzioni:
//   --file <path>       obbligatorio
//   --local | --remote  default: --local
//   --database <name>   default: lead-machine
//   --config <path>     default: wrangler.jsonc del progetto
//   --yes               obbligatorio con --remote
// ============================================================
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decryptBuffer, isEncrypted } from "./backup-crypto.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");

function fail(message) {
  console.error(`ERRORE: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? null : args[index + 1] ?? null;
}
const file = option("file");
const database = option("database") || "lead-machine";
const config = path.resolve(option("config") || path.join(ROOT, "wrangler.jsonc"));
const remote = args.includes("--remote");
const local = args.includes("--local");

if (!file) fail("serve --file <backup.sql|backup.sql.enc>.");
if (!fs.existsSync(file)) fail(`file non trovato: ${file}`);
if (!fs.existsSync(WRANGLER)) fail("Wrangler non trovato in node_modules: esegui `npm ci`.");
if (remote && local) fail("scegli --local oppure --remote, non entrambi.");
if (remote && !args.includes("--yes")) {
  fail("il ripristino remoto è distruttivo: aggiungi --yes per confermare.");
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lm-restore-"));
let sqlPath = file;
try {
  const raw = fs.readFileSync(file);
  if (isEncrypted(raw)) {
    const passphrase = (process.env.LEAD_MACHINE_BACKUP_PASSPHRASE || "").trim();
    if (!passphrase) {
      fail("backup cifrato: imposta LEAD_MACHINE_BACKUP_PASSPHRASE con la passphrase usata per crearlo.");
    }
    const plain = decryptBuffer(raw, passphrase);
    sqlPath = path.join(tmpDir, "restore.sql");
    fs.writeFileSync(sqlPath, plain, { mode: 0o600 });
    console.log(`Decifrato ${path.basename(file)} (${plain.length} byte) in una cartella temporanea.`);
  }

  console.log(`\nRipristino di ${path.basename(file)} nel database "${database}" (${remote ? "remoto" : "locale"})...\n`);
  const result = spawnSync(
    process.execPath,
    [
      WRANGLER,
      "d1",
      "execute",
      database,
      remote ? "--remote" : "--local",
      "--file",
      sqlPath,
      "--config",
      config,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
    }
  );

  if (result.status !== 0) {
    const detail = `${result.stdout || ""}\n${result.stderr || ""}`.trim().slice(-2000);
    fail(`wrangler ha restituito ${result.status}\n${detail}`);
  }

  console.log("Ripristino completato. Verifica i conteggi dalle pagine dell'app (lead, ricevute) prima di considerarlo finito.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
