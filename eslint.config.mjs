import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// ESLint 9 usa la flat config. `next lint` e' deprecato da Next 15.5 e sparisce
// in Next 16, quindi il lint gira direttamente con la CLI (`npm run lint`).
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    // Output di build e artefatti: `next lint` li escludeva per noi, la CLI no.
    ignores: [
      ".next/**",
      ".open-next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "dev.db",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
