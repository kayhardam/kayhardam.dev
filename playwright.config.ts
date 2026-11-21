import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// After Coachboard's playwright.config.ts (commit 4ceafd4).
// The tests run against `wrangler dev`, which serves dist/ the way production
// does: _headers, trailing slashes and the 404 page.
// E2E_BASE_URL runs them against a deployed site instead, without wrangler dev.
// Port 8788, not 8787: Coachboard's e2e tests may run at the same time.
const port = 8788;
const deployed = process.env.E2E_BASE_URL;

// The holding page (Kay, 20 November 2026): while src/pages/index.astro imports Holding.astro,
// the specs of the full page (Home.astro) don't run and e2e/holding.spec.ts does. With
// Home.astro back it is the other way round: nothing here changes. The other specs (a11y,
// i18n, icons, notfound, security, seo) hold for both pages. The import line decides, not
// what a comment in that file names.
const holding = /^import \w+ from "\.\.\/components\/Holding\.astro";$/m.test(readFileSync(new URL("./src/pages/index.astro", import.meta.url), "utf8"));
const fullPage = ["art", "board", "board-box", "lens", "narrow", "page", "play", "spacing"].map((name) => `**/${name}.spec.ts`);

export default defineConfig({
  testDir: "e2e",
  testIgnore: holding ? fullPage : ["**/holding.spec.ts"],
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
