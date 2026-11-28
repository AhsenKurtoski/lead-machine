#!/usr/bin/env node
// Backup giornaliero del database D1 di Lead Machine.
// Il file viene creato fuori dal repository, in ~/Lead-Machine-Backups.
import { spawn } from "node:child_process";
import { appendFile, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { encryptBuffer } from "./backup-crypto.mjs";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupDir = path.resolve(
  process.env.LEAD_MACHINE_BACKUP_DIR || path.join(os.homedir(), "Lead-Machine-Backups")
);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(backupDir, `lead-machine-${stamp}.sql`);
const logPath = path.join(backupDir, "backup.log");
const wranglerBin = path.join(projectDir, "node_modules", "wrangler", "bin", "wrangler.js");

async function log(message) {
  await appendFile(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
}

await mkdir(backupDir, { recursive: true });
await log(`Avvio backup: ${output}`);

const child = spawn(
  process.execPath,
  [
    wranglerBin,
    "d1",
    "export",
    "lead-machine",
    "--remote",
    "--config",
    path.join(projectDir, "wrangler.jsonc"),
    "--output",
    output,
  ],
  {
    cwd: projectDir,
    // Task Scheduler non ha un terminale: niente prompt e nessun output
    // interattivo. Lo stdout contiene anche URL firmati, quindi non lo salviamo.
    env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "ignore", "pipe"],
  }
);

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

const exitCode = await new Promise((resolve) => child.on("close", (code) => resolve(code ?? 1)));

if (exitCode !== 0) {
  const detail = stderr.trim().slice(-1000);
  await log(`FALLITO: wrangler ha restituito il codice ${exitCode}${detail ? `\n${detail}` : ""}`);
  process.exit(exitCode);
}

try {
  const info = await stat(output);
  if (info.size < 100) {
    await log(`FALLITO: file vuoto o troppo piccolo (${info.size} byte)`);
    process.exit(1);
  }

  // Il dump contiene dati personali: con la passphrase impostata il file in
  // chiaro non resta su disco. Se la cifratura fallisce, il dump viene
  // rimosso: meglio nessun backup che un backup in chiaro creduto cifrato.
  const passphrase = (process.env.LEAD_MACHINE_BACKUP_PASSPHRASE || "").trim();
  if (passphrase) {
    let encrypted;
    try {
      encrypted = encryptBuffer(await readFile(output), passphrase);
    } catch (error) {
      await unlink(output).catch(() => undefined);
      throw error;
    }
    const encryptedPath = `${output}.enc`;
    await writeFile(encryptedPath, encrypted, { mode: 0o600 });
    await unlink(output);
    const encInfo = await stat(encryptedPath);
    await log(`OK (cifrato): ${encryptedPath} (${encInfo.size} byte)`);
    console.log(`Backup D1 cifrato: ${encryptedPath} (${encInfo.size} byte)`);
  } else {
    await log(`OK: ${output} (${info.size} byte)`);
    console.log(`Backup D1 completato: ${output} (${info.size} byte)`);
  }
} catch (error) {
  await log(`FALLITO: file non creato (${error instanceof Error ? error.message : String(error)})`);
  process.exit(1);
}
