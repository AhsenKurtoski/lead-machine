const fs = require("fs");
const path = require("path");

const FOOTER = {
  en: { product: "Product", resources: "Resources", legal: "Legal" },
  it: { product: "Prodotto", resources: "Risorse", legal: "Legale" },
  de: { product: "Produkt", resources: "Ressourcen", legal: "Rechtliches" },
  fr: { product: "Produit", resources: "Ressources", legal: "Mentions légales" },
  sl: { product: "Izdelek", resources: "Viri", legal: "Pravno" },
  es: { product: "Producto", resources: "Recursos", legal: "Legal" },
  pt: { product: "Produto", resources: "Recursos", legal: "Legal" },
};

const messagesDir = path.join(__dirname, "..", "messages");
let errors = 0;

for (const [locale, values] of Object.entries(FOOTER)) {
  const file = path.join(messagesDir, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  if (json.footer) {
    console.log(`SKIP ${locale}: footer already exists`);
    continue;
  }
  json.footer = values;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Updated ${locale}.json`);
}

if (errors) process.exit(1);
console.log("Done.");
