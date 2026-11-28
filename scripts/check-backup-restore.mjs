#!/usr/bin/env node
// ============================================================
// Verifica reale del backup D1: esporta un database locale, lo reimporta in
// un database nuovo e controlla che i dati siano identici.
//
// `scripts/backup-d1.mjs` produce il dump in produzione, ma un backup mai
// ripristinato non e' un backup: questo controllo fa il giro completo con lo
// stesso comando di Wrangler (`d1 export`), su un D1 locale (workerd/SQLite),
// quindi non serve alcun account Cloudflare.
//
// Uso: node scripts/check-backup-restore.mjs
// ============================================================
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decryptBuffer, encryptBuffer, isEncrypted } from "./backup-crypto.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
const RESTORE = path.join(ROOT, "scripts", "restore-d1-backup.mjs");
const PASSPHRASE = "check-backup-passphrase-2026";
const MIGRATIONS = path.join(ROOT, "migrations");
const DB_NAME = "lead-machine-backup-check";

if (!fs.existsSync(WRANGLER)) {
  console.error("Wrangler non trovato in node_modules: esegui `npm ci` prima del controllo.");
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lm-backup-check-"));
const dump = path.join(tmp, "dump.sql");
let failures = 0;

function record(name, passed, detail = "") {
  if (passed) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function wrangler(dir, args) {
  const config = path.join(tmp, dir, "wrangler.jsonc");
  const result = spawnSync(
    process.execPath,
    [WRANGLER, ...args, "--config", config],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
    }
  );
  if (result.status !== 0) {
    const detail = `${result.stdout || ""}\n${result.stderr || ""}`.trim().slice(-2000);
    throw new Error(`wrangler ${args.join(" ")} è fallito (codice ${result.status})\n${detail}`);
  }
  return result.stdout || "";
}

// Ogni verificatore ha il proprio stato locale `.wrangler/state`, creato
// accanto al file di configurazione: così il controllo non tocca lo stato D1
// usato da `wrangler dev`.
function prepare(dir) {
  fs.mkdirSync(path.join(tmp, dir), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, dir, "wrangler.jsonc"),
    JSON.stringify(
      {
        $schema: path.join(ROOT, "node_modules", "wrangler", "config-schema.json"),
        name: DB_NAME,
        compatibility_date: "2026-11-08",
        compatibility_flags: ["nodejs_compat"],
        d1_databases: [
          {
            binding: "DB",
            database_name: DB_NAME,
            database_id: "00000000-0000-0000-0000-000000000001",
            migrations_dir: MIGRATIONS,
          },
        ],
      },
      null,
      2
    )
  );
}

function migrate(dir) {
  wrangler(dir, ["d1", "migrations", "apply", DB_NAME, "--local"]);
}

function query(dir, sql) {
  const out = wrangler(dir, ["d1", "execute", DB_NAME, "--local", "--json", "--command", sql]);
  const start = out.indexOf("[");
  if (start === -1) throw new Error(`risposta non JSON da wrangler: ${out.slice(0, 400)}`);
  const parsed = JSON.parse(out.slice(start));
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  return first?.results ?? [];
}

try {
  console.log(`\nBackup e ripristino D1 in ${tmp}\n`);

  prepare("source");
  prepare("restore");
  migrate("source");

  wrangler("source", [
    "d1",
    "execute",
    DB_NAME,
    "--local",
    "--command",
    "INSERT INTO \"Setting\" (key, value) VALUES ('backup-check', '42');",
  ]);
  const sourceSettings = query("source", "SELECT COUNT(*) AS c FROM \"Setting\";");
  const sourceLeads = query("source", "SELECT COUNT(*) AS c FROM \"Lead\";");

  wrangler("source", [
    "d1",
    "export",
    DB_NAME,
    "--local",
    "--skip-confirmation",
    "--output",
    dump,
  ]);
  record("export locale produce un dump non vuoto", fs.existsSync(dump) && fs.statSync(dump).size > 0, dump);

  // --- Cifratura e ripristino del file cifrato ---------------------------
  const plain = fs.readFileSync(dump);
  const encrypted = encryptBuffer(plain, PASSPHRASE);
  const encryptedPath = `${dump}.enc`;
  fs.writeFileSync(encryptedPath, encrypted);
  record(
    "il backup cifrato non contiene il dump in chiaro",
    isEncrypted(encrypted) &&
      !encrypted.includes(Buffer.from("backup-check")) &&
      !encrypted.includes(Buffer.from("CREATE TABLE")),
    `${plain.length} byte in chiaro -> ${encrypted.length} byte cifrati`
  );
  record("la decifratura restituisce il dump identico", decryptBuffer(encrypted, PASSPHRASE).equals(plain));

  let wrongPassphraseRejected = false;
  try {
    decryptBuffer(encrypted, "passphrase-completamente-sbagliata");
  } catch {
    wrongPassphraseRejected = true;
  }
  record("una passphrase errata viene rifiutata", wrongPassphraseRejected);

  const tampered = Buffer.from(encrypted);
  tampered[tampered.length - 1] ^= 0xff;
  let tamperedRejected = false;
  try {
    decryptBuffer(tampered, PASSPHRASE);
  } catch {
    tamperedRejected = true;
  }
  record("un file manomesso viene rifiutato (GCM)", tamperedRejected);

  // Il ripristino reale avviene su un database vuoto: il dump contiene sia lo
  // schema sia i dati (e la tabella `d1_migrations`). Importarlo sopra un
  // database gia' migrato fallirebbe, ed e' giusto che fallisca. Qui passa
  // dallo script vero, quindi si prova anche la decifratura e il CLI.
  const restoreRun = spawnSync(
    process.execPath,
    [
      RESTORE,
      "--file",
      encryptedPath,
      "--local",
      "--database",
      DB_NAME,
      "--config",
      path.join(tmp, "restore", "wrangler.jsonc"),
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, LEAD_MACHINE_BACKUP_PASSPHRASE: PASSPHRASE, CI: "1" },
    }
  );
  record(
    "lo script di ripristino importa il backup cifrato",
    restoreRun.status === 0,
    (restoreRun.stderr || restoreRun.stdout || "").trim().slice(-300)
  );

  const restored = query("restore", "SELECT value FROM \"Setting\" WHERE key = 'backup-check';");
  record(
    "la riga inserita dopo il dump è presente dopo il ripristino",
    restored.length === 1 && String(restored[0].value) === "42",
    JSON.stringify(restored)
  );

  const restoredSettings = query("restore", "SELECT COUNT(*) AS c FROM \"Setting\";");
  const restoredLeads = query("restore", "SELECT COUNT(*) AS c FROM \"Lead\";");
  record(
    "il conteggio delle righe coincide con l'originale",
    Number(restoredSettings[0]?.c) === Number(sourceSettings[0]?.c) &&
      Number(restoredLeads[0]?.c) === Number(sourceLeads[0]?.c),
    `Setting ${sourceSettings[0]?.c} -> ${restoredSettings[0]?.c}, Lead ${sourceLeads[0]?.c} -> ${restoredLeads[0]?.c}`
  );

  const tables = query(
    "restore",
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = 'RateLimit';"
  );
  record("lo schema ripristinato contiene anche le tabelle nuove", Number(tables[0]?.c) === 1, JSON.stringify(tables));
} catch (error) {
  failures += 1;
  console.error(`\nERRORE: ${error instanceof Error ? error.message : String(error)}\n`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nRisultato: ${failures === 0 ? "backup ripristinato e verificato" : `${failures} controlli falliti`}.\n`);
process.exitCode = failures === 0 ? 0 : 1;
