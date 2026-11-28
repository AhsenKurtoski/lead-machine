#!/usr/bin/env node
// ============================================================
// Verifica delle MUTAZIONI dell'interfaccia su un server vero.
//
// `check-ui.mjs` apre le pagine e le controlla, ma non clicca niente che
// scriva: un errore nel wiring di un form o di un pulsante non lo vedrebbe.
// `test:flows` esercita le API, non il browser. Qui il giro e' completo:
//
//   1. cambia stato a un lead dalla scheda, verifica la PATCH, ricarica la
//      pagina e controlla che il nuovo stato sia davvero quello mostrato;
//   2. apre il dialogo di eliminazione, verifica che abbia un nome
//      accessibile, che il focus sia dentro, che axe non trovi violazioni
//      gravi e che Escape lo chiuda senza cancellare il lead;
//   3. rimette lo stato originale (anche in caso di errore).
//
// Non crea dati finti: usa un lead del seed e ripristina cio' che tocca.
//
// Uso: APP_PASSWORD=... BASE_URL=http://127.0.0.1:3111 node scripts/check-ui-flows.mjs
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || process.env.SMOKE_BASE || "http://127.0.0.1:3111").replace(/\/$/, "");
const password = process.env.APP_PASSWORD || process.env.SMOKE_PASSWORD || "";
const STATUSES = ["NUOVO", "CONTATTATO", "IN_TRATTATIVA", "CLIENTE", "SCARTATO"];

if (!password) {
  console.error("APP_PASSWORD non impostata: il controllo deve partire da una sessione autenticata.");
  process.exit(1);
}

const axePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "axe-core", "axe.min.js");
const axeSource = fs.existsSync(axePath) ? fs.readFileSync(axePath, "utf8") : "";
if (!axeSource) console.warn("axe-core non installato: controllo del dialogo saltato (npm ci lo include).");

let failures = 0;
function record(name, passed, detail = "") {
  if (passed) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
}

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
let leadId = null;
let originalStatus = null;

try {
  console.log(`\nMutazioni dell'interfaccia su ${BASE_URL}\n`);
  await login(page);

  const listResponse = await page.request.get(`${BASE_URL}/api/leads`);
  const list = await listResponse.json();
  const lead = Array.isArray(list.leads) ? list.leads[0] : null;
  if (!lead) throw new Error("Nessun lead nel database: esegui `npm run setup` prima del controllo.");
  leadId = lead.id;
  originalStatus = lead.status;
  const target = STATUSES.find((status) => status !== originalStatus);
  if (!target) throw new Error(`Stato di partenza inatteso: ${originalStatus}`);

  await page.goto(`${BASE_URL}/crm/${leadId}`, { waitUntil: "domcontentloaded" });
  await page.locator(`[data-testid="status-${target}"]`).waitFor({ state: "visible" });

  const patched = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/leads/${leadId}`) &&
      response.request().method() === "PATCH",
    { timeout: 15000 }
  );
  await page.click(`[data-testid="status-${target}"]`);
  const patchResponse = await patched;
  record(`cambio stato "${originalStatus}" -> "${target}": PATCH 200`, patchResponse.status() === 200, `HTTP ${patchResponse.status()}`);

  const afterPatch = await (await page.request.get(`${BASE_URL}/api/leads/${leadId}`)).json();
  record("lo stato è stato salvato davvero", afterPatch.lead?.status === target, `API: ${afterPatch.lead?.status}`);

  // Ricarica: il controllo deve vedere il dato persistito, non lo stato React.
  await page.reload({ waitUntil: "domcontentloaded" });
  const activeClass = await page
    .locator(`[data-testid="status-${target}"]`)
    .waitFor({ state: "visible" })
    .then(() => page.locator(`[data-testid="status-${target}"]`).getAttribute("class"));
  record("dopo il ricaricamento la scheda mostra lo stato salvato", (activeClass || "").includes("border-primary"), activeClass || "classe assente");

  // --- Dialogo di eliminazione -------------------------------------------
  await page.locator('[data-testid="delete-lead"]').click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: "visible" });
  record("il dialogo di eliminazione si apre", (await dialog.count()) === 1);

  const dialogName = await dialog.getAttribute("aria-labelledby");
  // Gli id di Radix contengono ":" (es. "radix-:r1:"): un selettore CSS
  // `#id` non sarebbe valido, quindi si legge il nodo per id nel DOM.
  const labelText = await page.evaluate(
    (id) => (id ? document.getElementById(id)?.textContent ?? "" : ""),
    dialogName
  );
  record("il dialogo ha un nome accessibile", Boolean(dialogName && labelText?.trim()), `aria-labelledby=${dialogName || "assente"}`);

  const focusInside = await page.evaluate(() => {
    const node = document.querySelector('[role="dialog"]');
    return Boolean(node && document.activeElement && node.contains(document.activeElement));
  });
  record("il focus entra nel dialogo", focusInside);

  if (axeSource) {
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const node = document.querySelector('[role="dialog"]');
      const result = await window.axe.run(node, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return result.violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => `${v.id} (${v.impact})`);
    });
    record("axe: nessuna violazione grave nel dialogo", violations.length === 0, violations.join(", "));
  }

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  record("Escape chiude il dialogo", (await dialog.count()) === 0 || !(await dialog.isVisible()));

  const stillThere = await page.request.get(`${BASE_URL}/api/leads/${leadId}`);
  record("il lead non è stato cancellato", stillThere.status() === 200, `HTTP ${stillThere.status()}`);
} catch (error) {
  failures += 1;
  console.error(`\nERRORE: ${error instanceof Error ? error.message : String(error)}\n`);
} finally {
  // Ripristina lo stato originale anche se qualcosa e' andato storto.
  if (leadId && originalStatus) {
    try {
      const response = await page.request.patch(`${BASE_URL}/api/leads/${leadId}`, {
        data: { status: originalStatus },
      });
      if (response.status() === 200) console.log(`  RIPRISTINO  stato "${originalStatus}" ripristinato sul lead usato per la prova`);
      else console.error(`  RIPRISTINO FALLITO  HTTP ${response.status()}: controlla lo stato del lead ${leadId}`);
    } catch (error) {
      failures += 1;
      console.error(`  RIPRISTINO FALLITO: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await browser.close();
}

console.log(`\nRisultato: ${failures === 0 ? "mutazioni verificate" : `${failures} controlli falliti`}.\n`);
process.exitCode = failures === 0 ? 0 : 1;
