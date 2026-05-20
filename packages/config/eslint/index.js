// @ts-check

/** @type {import("eslint").Linter.Config} */
const base = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  env: {
    es2022: true,
  },
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
  },
  rules: {
    // TypeScript
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/no-non-null-assertion": "warn",

    // Imports
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-duplicates": "error",
    "import/no-cycle": "error",

    // General
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    ".astro/",
    "coverage/",
    "*.min.js",
  ],
};

/** @type {import("eslint").Linter.Config} */
const nextjs = {
  ...base,
  extends: [
    ...base.extends,
    "next/core-web-vitals",
    "plugin:jsx-a11y/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: [...(base.plugins ?? []), "jsx-a11y", "react", "react-hooks"],
  env: {
    ...base.env,
    browser: true,
    node: true,
  },
  settings: {
    ...base.settings,
    react: { version: "detect" },
  },
  rules: {
    ...base.rules,
    // React
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    // A11y — crítico para SafeWork AI
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/no-autofocus": "error",
    "jsx-a11y/interactive-supports-focus": "error",
  },
};

/** @type {import("eslint").Linter.Config} */
const astro = {
  ...base,
  extends: [
    ...base.extends,
    "plugin:astro/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  plugins: [...(base.plugins ?? []), "jsx-a11y"],
  env: {
    ...base.env,
    browser: true,
    node: true,
  },
  overrides: [
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
    },
  ],
  rules: {
    ...base.rules,
    "jsx-a11y/anchor-is-valid": "error",
  },
};

/** @type {import("eslint").Linter.Config} */
const node = {
  ...base,
  env: {
    ...base.env,
    node: true,
  },
  rules: {
    ...base.rules,
    "no-console": "off",
  },
};

module.exports = { base, nextjs, astro, node };
