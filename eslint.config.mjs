// Tooling compatibility note — why ESLint is pinned to 9.x (do not bump to 10 yet):
// eslint-config-next (all 16.x) hard-depends on eslint-plugin-react, eslint-plugin-import and
// eslint-plugin-jsx-a11y, none of which support ESLint 10. eslint-plugin-react 7.37.5 crashes
// on ESLint 10 (context.getFilename() was removed). TypeScript is pinned to 5.9.x because
// typescript-eslint does not support TypeScript 7 yet (peer range: <6.1.0).
// Revisit when eslint-plugin-react ships ESLint 10 support (or eslint-config-next drops it)
// AND typescript-eslint supports TypeScript >= 7.1. See README "Tooling compatibility".
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
