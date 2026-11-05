// ============================================================
// Chi ha creato il progetto, in un posto solo.
//
// Sta qui (e non dentro seo.ts) perche' serve anche ai componenti
// client — il credito in fondo alla barra laterale — e seo.ts importa
// tipi di Next: cosi' il browser non si porta dietro il codice della
// sitemap solo per mostrare un nome.
//
// Il nome e' un dato del progetto, non una stringa decorativa: keywords,
// dati strutturati, package.json, README e interfaccia devono dire tutti la
// stessa cosa, e `src/lib/seo.test.ts` lo verifica.
// ============================================================

export const AUTHOR = {
  name: "Ahsen Kurtoski",
  /** Variante senza spazio: e' cosi' che viene cercato/profilato. */
  handle: "AhsenKurtoski",
  url: "https://github.com/AhsenKurtoski",
  jobTitle: "Software developer",
} as const;
