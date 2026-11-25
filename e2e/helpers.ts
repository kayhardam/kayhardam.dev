import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Locator, Page } from "@playwright/test";

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

/**
 * The colours the parts every page shares take from the site's palette (the roles in
 * src/styles/tokens.css), as a browser reports them: the ground, the text on it and the
 * accent. The page says which palette it is in, on <html> (src/data/palette.ts).
 */
const palettes = {
  oranje: { ground: "rgb(248, 250, 252)", text: "rgb(15, 23, 42)", accent: "rgb(234, 88, 12)" },
  inkt: { ground: "rgb(253, 251, 248)", text: "rgb(31, 26, 23)", accent: "rgb(30, 64, 175)" },
  hars: { ground: "rgb(22, 17, 13)", text: "rgb(255, 246, 232)", accent: "rgb(255, 179, 0)" },
} as const;

export async function paletteOf(page: Page) {
  const name = await page.locator("html").getAttribute("data-palette");
  if (name !== "oranje" && name !== "inkt" && name !== "hars") throw new Error(`<html> has data-palette="${name}"`);
  return palettes[name];
}

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

/**
 * The box of a text's own glyphs, in the window. Not locator.boundingBox(): for a <text> in
 * a nested <svg>, WebKit's box of the element leaves out the text's own x and y (CI, 17
 * November 2026: the ball's label was drawn in the right place, and measured 28 px lower).
 */
export const glyphBox = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
