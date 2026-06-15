import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/load-env.ts", "./src/tests/setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
