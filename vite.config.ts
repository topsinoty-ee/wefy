/// <reference types="vitest" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "wefy",
      formats: ["es", "cjs"],
      fileName: (format, name) =>
        format === "es" ? `${name}.js` : `${name}.${format}.js`,
    },
    rollupOptions: {
      external: [/\.test\.ts$/, "node-fetch"],
    },
  },

  resolve: {
    alias: {
      wefy: resolve(__dirname, "./src/"),
    },
  },

  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["*.config.*", "*.d.ts"],
    coverage: {
      provider: "v8",
    },
  },

  plugins: [
    dts({
      outDir: ["dist/esm", "dist/cjs"],
      entryRoot: "src",
    }),
  ],
});
