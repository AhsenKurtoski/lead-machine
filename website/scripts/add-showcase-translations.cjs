const fs = require("fs");
const path = require("path");

const SHOWCASE = {
  en: {
    title: "See it in action — right now",
    subtitle:
      "Real businesses from OpenStreetMap. Real lead scores. Real AI outreach with your own keys. No sign-up, no installation.",
  },
  it: {
    title: "Vedilo in azione — adesso",
    subtitle:
      "Attività reali da OpenStreetMap. Score reali. Outreach AI con le tue chiavi. Nessuna registrazione, nessuna installazione.",
  },
  de: {
    title: "Sehen Sie es jetzt in Aktion",
    subtitle:
      "Echte Unternehmen von OpenStreetMap. Echte Lead-Scores. Echte KI-Outreach mit Ihren eigenen Schlüsseln. Keine Anmeldung, keine Installation.",
  },
  fr: {
    title: "Voyez-le en action — maintenant",
    subtitle:
      "De vraies entreprises d'OpenStreetMap. De vrais scores. Une vraie prospection IA avec vos clés. Sans inscription, sans installation.",
  },
  sl: {
    title: "Oglejte si ga v akciji — zdaj",
    subtitle:
      "Prava podjetja iz OpenStreetMapa. Pravi rezultati. Pravo AI nagovarjanje z vašimi ključi. Brez registracije, brez namestitve.",
  },
  es: {
    title: "Vívelo en acción — ahora",
    subtitle:
      "Negocios reales de OpenStreetMap. Puntuaciones reales. Outreach IA real con tus claves. Sin registro, sin instalación.",
  },
  pt: {
    title: "Veja em ação — agora",
    subtitle:
      "Negócios reais do OpenStreetMap. Pontuações reais. Outreach de IA real com as suas chaves. Sem registo, sem instalação.",
  },
};

const messagesDir = path.join(__dirname, "..", "messages");
let errors = 0;

for (const [locale, values] of Object.entries(SHOWCASE)) {
  const file = path.join(messagesDir, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  if (json.showcase) {
    console.log(`SKIP ${locale}: showcase already exists`);
    continue;
  }
  json.showcase = values;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Updated ${locale}.json`);
}

if (errors) process.exit(1);
console.log("Done.");
