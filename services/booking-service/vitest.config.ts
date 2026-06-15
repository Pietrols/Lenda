import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./src/tests/global-setup.ts"],
    setupFiles: ["./src/tests/load-env.ts", "./src/tests/setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
