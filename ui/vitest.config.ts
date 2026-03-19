import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@engine/": path.resolve(__dirname, "../engine") + "/",
      "@scenarios/": path.resolve(__dirname, "../scenarios") + "/",
    },
  },
});