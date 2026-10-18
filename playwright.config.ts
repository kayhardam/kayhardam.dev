import { defineConfig, devices } from "@playwright/test";

// After Coachboard's playwright.config.ts (commit 4ceafd4).
// The tests run against `wrangler dev`, which serves dist/ the way production
// does: _headers, trailing slashes and the 404 page.
// E2E_BASE_URL runs them against a deployed site instead, without wrangler dev.
// Port 8788, not 8787: Coachboard's e2e tests may run at the same time.
const port = 8788;
const deployed = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: deployed ?? `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "iphone", use: { ...devices["iPhone 15"] } },
  ],
  webServer: deployed ? undefined : {
    command: `npm run build && npx wrangler dev --ip 127.0.0.1 --port ${port} --show-interactive-dev-session=false --log-level warn`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { WRANGLER_SEND_METRICS: "false" },
  },
});
