import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    globals: false,
    hookTimeout: 600_000,
    include: ["examples/tests/**/*.test.ts"],
    testTimeout: 600_000,
  },
});
