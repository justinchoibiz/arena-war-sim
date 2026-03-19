import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@engine/": path.resolve(__dirname, "../engine") + "/",
      "@scenarios/": path.resolve(__dirname, "../scenarios") + "/",
    },
  },
});