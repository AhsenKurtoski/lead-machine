const fs = require("fs");
const path = require("path");

const KEYS = {
  sortLabel: { en: "Sort by", it: "Ordina per", de: "Sortieren nach", fr: "Trier par", sl: "Razvrsti po", es: "Ordenar por", pt: "Ordenar por" },
  bestScore: { en: "Best score", it: "Miglior score", de: "Beste Punktzahl", fr: "Meilleur score", sl: "Najboljši rezultat", es: "Mejor puntuación", pt: "Melhor pontuação" },
  nearest: { en: "Nearest", it: "Più vicini", de: "Am nächsten", fr: "Les plus proches", sl: "Najbližji", es: "Los más cercanos", pt: "Mais próximos" },
  exportCsv: { en: "Export CSV", it: "Esporta CSV", de: "CSV exportieren", fr: "Exporter en CSV", sl: "Izvozi CSV", es: "Exportar CSV", pt: "Exportar CSV" },
  exported: { en: "Leads exported", it: "Lead esportati", de: "Leads exportiert", fr: "Leads exportés", sl: "Lead-i izvoženi", es: "Leads exportados", pt: "Leads exportados" },
};

const messagesDir = path.join(__dirname, "..", "messages");
let errors = 0;

for (const locale of ["en", "it", "de", "fr", "sl", "es", "pt"]) {
  const file = path.join(messagesDir, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!json.demo || !json.demo.search) {
    console.log(`SKIP ${locale}: demo.search missing`);
    errors++;
    continue;
  }
  let changed = false;
  for (const [key, values] of Object.entries(KEYS)) {
    if (json.demo.search[key]) continue;
    json.demo.search[key] = values[locale];
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
    console.log(`Updated ${locale}.json`);
  } else {
    console.log(`SKIP ${locale}: keys already present`);
  }
}

if (errors) process.exit(1);
console.log("Done.");
