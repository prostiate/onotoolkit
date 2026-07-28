import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["apps/web/tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "~": new URL("./apps/web/app", import.meta.url).pathname,
      "@": new URL("./apps/web/app", import.meta.url).pathname
    }
  }
});
