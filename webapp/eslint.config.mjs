import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Esta app hace fetch-on-mount simple (sin SWR/React Query, a propósito:
      // el proyecto es intencionalmente liviano). Ese patrón siempre dispara
      // este diagnóstico experimental del React Compiler aunque no haya bug real.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Frontend estático legacy servido tal cual, no es parte del bundle de la app.
    "public/**",
  ]),
]);

export default eslintConfig;
