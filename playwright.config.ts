import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = "http://127.0.0.1:3100";

// Local Windows runs exercise the system Edge installation. GitHub-hosted CI has
// system Chrome; other local platforms can fall back to Playwright's Chromium.
const systemBrowser = process.env.CI
  ? { channel: "chrome" as const }
  : process.platform === "win32"
    ? { channel: "msedge" as const }
    : {};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.mjs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: "list",
  outputDir: "node_modules/.cache/playwright-test-results",
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    ...systemBrowser,
    baseURL: FRONTEND_URL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [{ name: process.env.CI ? "system-chrome" : "system-edge" }],
});
