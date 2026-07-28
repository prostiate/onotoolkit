import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  timeout: 120_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:8788",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        // Build then serve the real SSR Worker via wrangler dev, so e2e exercises
        // the production rendering path (not just a static preview).
        command: "pnpm run preview:worker",
        url: "http://127.0.0.1:8788",
        reuseExistingServer: !process.env.CI,
        timeout: 240_000
      }
});
