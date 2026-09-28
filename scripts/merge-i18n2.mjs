// scripts/merge-i18n2.mjs
// Aggiunge un secondo blocco di traduzioni (scripts/i18n-add2/*.json) al dizionario.
// Idempotente, con verifica di parita' tra tutti i locali.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dictPath = path.join(here, "..", "src", "lib", "i18n-dictionaries.ts");
const dir = path.join(here, "i18n-add2");

const locales = ["it", "de", "fr", "sl", "en", "es", "pt"];

const data = {};
for (const loc of locales) {
  data[loc] = JSON.parse(fs.readFileSync(path.join(dir, `${loc}.json`), "utf8"));
}

const refKeys = Object.keys(data.it).sort();
let parityError = false;
for (const loc of locales) {
  if (loc === "it") continue;
  const keys = Object.keys(data[loc]).sort();
  const missing = refKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !refKeys.includes(k));
  if (missing.length || extra.length) {
    parityError = true;
    console.error(`PARITA' KO per ${loc}:`);
    if (missing.length) console.error(`  mancanti: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra: ${extra.join(", ")}`);
  }
}
if (parityError) {
  console.error("\nCorreggi la parita' delle chiavi prima di procedere.");
  process.exit(1);
}
console.log(`Parita' chiavi OK: ${refKeys.length} chiavi per locale.`);

function buildBlock(entries) {
  return Object.entries(entries)
    .map(([k, v]) => {
      const safe = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `    "${k}": "${safe}",`;
    })
    .join("\n");
}

let src = fs.readFileSync(dictPath, "utf8");
let updated = 0;

for (const loc of locales) {
  const marker = `\n  ${loc}: {`;
  const start = src.indexOf(marker);
  if (start === -1) {
    console.error(`Locale non trovato: ${loc}`);
    process.exit(2);
  }
  let end = src.indexOf("\n  },", start);
  if (end === -1) {
    console.error(`Chiusura non trovata per: ${loc}`);
    process.exit(2);
  }
  const block = src.slice(start, end);
  if (block.includes(`"api.scopeRead"`)) {
    console.log(`- ${loc}: gia' presente, salto`);
    continue;
  }
  src = src.slice(0, end) + "\n\n    // API key scopes\n" + buildBlock(data[loc]) + src.slice(end);
  updated++;
  console.log(`+ ${loc}: ${Object.keys(data[loc]).length} chiavi aggiunte`);
}

fs.writeFileSync(dictPath, src, "utf8");
console.log(`\nFatto. Locali aggiornati: ${updated}`);
