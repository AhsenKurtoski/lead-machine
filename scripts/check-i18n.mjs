// scripts/check-i18n.mjs
// Verifica parità chiavi i18n: ogni locale deve avere tutte le chiavi di `it` (riferimento).
// Uso: node scripts/check-i18n.mjs [--strict]
// Exit code 1 se mancano chiavi (utile in CI).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dictPath = path.join(here, "..", "src", "lib", "i18n-dictionaries.ts");
const src = fs.readFileSync(dictPath, "utf8");

// Estrae le chiavi "xxx.yyy" per ogni locale con un parser semplice a graffe.
const locales = ["it", "de", "fr", "sl", "en", "es", "pt"];
const keysByLocale = {};
for (const loc of locales) {
  const start = src.indexOf(`\n  ${loc}: {`);
  if (start === -1) {
    console.error(`Locale non trovato nel file: ${loc}`);
    process.exit(2);
  }
  // Trova la chiusura del blocco del locale (prossimo "\n  }," o "\n  },\n};")
  let end = src.indexOf("\n  },", start);
  if (end === -1) end = src.length;
  const block = src.slice(start, end);
  const keys = new Set();
  const re = /"([^"]+)"\s*:/g;
  let m;
  while ((m = re.exec(block))) keys.add(m[1]);
  keysByLocale[loc] = keys;
}

const ref = [...keysByLocale.it].sort();
console.log(`Chiavi di riferimento (it): ${ref.length}`);
let missing = 0;
for (const loc of locales) {
  if (loc === "it") continue;
  const miss = ref.filter((k) => !keysByLocale[loc].has(k));
  const extra = [...keysByLocale[loc]].filter((k) => !keysByLocale.it.has(k));
  if (miss.length === 0 && extra.length === 0) {
    console.log(`✅ ${loc}: completo (${keysByLocale[loc].size} chiavi)`);
  } else {
    console.log(`❌ ${loc}: mancano ${miss.length}, extra ${extra.length}`);
    for (const k of miss.slice(0, 50)) console.log(`   - manca: ${k}`);
    if (miss.length > 50) console.log(`   ... e altre ${miss.length - 50}`);
    for (const k of extra.slice(0, 20)) console.log(`   + extra: ${k}`);
    missing += miss.length;
  }
}

// Controllo variabili {placeholders}: devono matchare tra it e gli altri locali.
const varRe = /\{([a-zA-Z_]+)\}/g;
function varsOf(s) {
  const out = new Set();
  let m;
  while ((m = varRe.exec(s))) out.add(m[1]);
  return out;
}
// Ricava i valori grezzi per confronto {vars}
let varMismatches = 0;
for (const key of ref) {
  const getVal = (loc) => {
    const start = src.indexOf(`\n  ${loc}: {`);
    let end = src.indexOf("\n  },", start);
    if (end === -1) end = src.length;
    const block = src.slice(start, end);
    const i = block.indexOf(`"${key}"`);
    if (i === -1) return null;
    const seg = block.slice(i, i + 400);
    const vm = seg.match(/:\s*"((?:[^"\\]|\\.)*)"/);
    return vm ? vm[1] : null;
  };
  const refVars = varsOf(getVal("it") || "");
  for (const loc of locales) {
    if (loc === "it") continue;
    const v = getVal(loc);
    if (v === null) continue;
    const lv = varsOf(v);
    const a = [...refVars].sort().join(",");
    const b = [...lv].sort().join(",");
    if (a !== b) {
      if (varMismatches < 20) console.log(`⚠️  vars diverse per "${key}": it={${a}} ${loc}={${b}}`);
      varMismatches++;
    }
  }
}
if (varMismatches > 0) console.log(`Variabili non allineate: ${varMismatches}`);

const strict = process.argv.includes("--strict");
if (missing > 0 || (strict && varMismatches > 0)) {
  console.log(`\nRISULTATO: KO (mancano ${missing} chiavi, ${varMismatches} vars diverse)`);
  process.exit(1);
} else {
  console.log("\nRISULTATO: OK");
}
