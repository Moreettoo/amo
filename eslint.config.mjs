import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A spec manda links entre paginas como <a> comum, que troca o
      // documento inteiro, nunca next/link. A regra existe para empurrar o
      // next/link, entao fica desligada.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scratch do processo (ignorado pelo git): de la vinham os avisos do lenis.min.js.
    ".superpowers/**",
  ]),
]);

export default eslintConfig;
