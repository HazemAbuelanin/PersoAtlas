import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/", "src/generated/", "public/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: globals.browser },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-cond-assign": "off",
      "no-control-regex": "off",
      "no-sparse-arrays": "off",
      "no-useless-escape": "off",
    },
  },
  { files: ["scripts/**/*.mjs", "*.config.js", "tests/**/*.js"], languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node, ...globals.browser } } },
];
