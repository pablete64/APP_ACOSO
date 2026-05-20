// @ts-check

/** @type {import("prettier").Config} */
const config = {
  // Formato general
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "es5",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",

  // Prosa (Markdown)
  proseWrap: "preserve",

  // HTML
  htmlWhitespaceSensitivity: "css",

  // Overrides por tipo de archivo
  overrides: [
    {
      files: ["*.json", "*.jsonc"],
      options: { printWidth: 80 },
    },
    {
      files: ["*.md", "*.mdx"],
      options: {
        proseWrap: "always",
        printWidth: 80,
      },
    },
    {
      files: ["*.astro"],
      options: {
        parser: "astro",
      },
    },
    {
      files: ["*.css", "*.scss"],
      options: {
        singleQuote: false,
      },
    },
    {
      files: ["*.yml", "*.yaml"],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: ["*.sql"],
      options: {
        // SQL usa su propio parser — aquí solo controlamos el whitespace
        tabWidth: 4,
      },
    },
  ],
};

module.exports = config;
