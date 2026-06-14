import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["packages/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "#opennav-engine": new URL(
        "./packages/engine/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
});
