import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// After Coachboard's playwright.config.ts (commit 4ceafd4).
// The tests run against `wrangler dev`, which serves dist/ the way production
// does: _headers, trailing slashes and the 404 page.
// E2E_BASE_URL runs them against a deployed site instead, without wrangler dev.
// Port 8788, not 8787: Coachboard's e2e tests may run at the same time.
const port = 8788;
const deployed = process.env.E2E_BASE_URL;

// The home page decides which page's specs run: the landing page (Landing.astro, Kay,
// 25 November 2026) has e2e/landing.spec.ts, the holding page (Holding.astro, 20 November
// 2026) e2e/holding.spec.ts, the full page (Home.astro) its own eight. The other specs (a11y,
// i18n, icons, notfound, security, seo) hold for every page. The import line in
// src/pages/index.astro decides, not what a comment in that file names.
const home = readFileSync(new URL("./src/pages/index.astro", import.meta.url), "utf8").match(/^import \w+ from "\.\.\/components\/(\w+)\.astro";$/m)?.[1];
const specs: Record<string, string[]> = {
  Landing: ["landing"],
  Holding: ["holding"],
  Home: ["art", "board", "board-box", "lens", "narrow", "page", "play", "spacing"],
};
const others = Object.entries(specs).flatMap(([page, names]) => (page === home ? [] : names.map((name) => `**/${name}.spec.ts`)));

export default defineConfig({
  testDir: "e2e",
  testIgnore: others,
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
