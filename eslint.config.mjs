import next from "eslint-config-next/core-web-vitals";

// ESLint 9 usa la flat config. Da Next 16 `next lint` non esiste piu' e
// `eslint-config-next` esporta direttamente un array flat: niente FlatCompat.
const config = [
  {
    // Output di build e artefatti: li escludiamo esplicitamente.
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "dev.db",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...next,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      // eslint-config-next 16 porta le regole del React Compiler
      // (eslint-plugin-react-hooks 7). Questa segnala ogni setState chiamato
      // in modo sincrono dentro un effetto, compresi i due pattern che l'app
      // usa di proposito e documenta nel codice: l'idratazione differita
      // (lingua, origine API, theme-toggle) e il caricamento dei dati al
      // cambio filtro. Non sono bug: i setState partono dopo fetch/await o
      // servono proprio a evitare il mismatch di idratazione lato server.
      // Da rivalutare se/ad quando si abilita `reactCompiler`.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
