import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Page } from "@playwright/test";

export { expect, test } from "@playwright/test";

/** The site's origin, as in astro.config.mjs. */
export const site = "https://kayhardam.dev";

/** Every page in the build (the webServer builds before the tests run), without the 404 page. */
export function allPages(): string[] {
  const dist = new URL("../dist/", import.meta.url).pathname;
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  return walk(dist)
    .filter((f) => f.endsWith("index.html"))
    .map((f) => "/" + relative(dist, f).replace(/index\.html$/, ""))
    .sort();
}

/** A URL in each language that gets the 404 page. */
export const missingPages = ["/does-not-exist/", "/en/does-not-exist/"];

/** Collects CSP violations from the moment the document exists. From Coachboard's e2e/helpers.ts. */
export async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener("securitypolicyviolation", (e) =>
      seen.push(`${e.effectiveDirective} blocked ${e.blockedURI || "inline"}: ${e.sample}`),
    );
  });
  return () => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
}
