import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node ≥ 20 tiene Web Crypto API nativa — no necesita polyfill
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/__tests__/**"],
      thresholds: {
        lines:     90,
        functions: 90,
        branches:  85,
        statements: 90,
      },
    },
  },
});
