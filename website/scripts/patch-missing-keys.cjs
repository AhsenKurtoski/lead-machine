const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "messages");

const patches = {
  en: { nav: { language: "Language", partnership: "Partnerships" }, meta: { license: "Released under MIT License." } },
  it: { nav: { language: "Lingua", partnership: "Partnership" }, meta: { license: "Rilasciato sotto licenza MIT." } },
  de: { nav: { language: "Sprache", partnership: "Partnerschaften" }, meta: { license: "Unter der MIT-Lizenz veröffentlicht." } },
  fr: { nav: { language: "Langue", partnership: "Partenariats" }, meta: { license: "Publié sous licence MIT." } },
  es: { nav: { language: "Idioma", partnership: "Alianzas" }, meta: { license: "Publicado bajo licencia MIT." } },
  pt: { nav: { language: "Idioma", partnership: "Parcerias" }, meta: { license: "Publicado sob licença MIT." } },
  sl: { nav: { language: "Jezik", partnership: "Partnerstva" }, meta: { license: "Objavljeno pod licenco MIT." } },
};

for (const [locale, patch] of Object.entries(patches)) {
  const file = path.join(dir, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.nav = { ...json.nav, ...patch.nav };
  json.meta = { ...json.meta, ...patch.meta };
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Patched ${locale}.json`);
}
console.log("Done.");
