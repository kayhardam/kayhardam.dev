import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

// The hero's box (Hars, 15 November 2026). The court has a fixed ratio (216 by 174,
// the viewBox), the text column fixed heights, so nothing moves while the fonts
// load or the board plays (e2e/play.spec.ts). Narrow: the court above the text, as
// wide as the column, at most 600 px; from 860 px the text left and the court right.

/** Screen width → the court's width. */
const widths: Record<number, number> = {
  320: 288,
  390: 358,
  412: 380,
  559: 527,
  560: 512,
  700: 600,
  859: 600,
  860: 408,
  1024: 497.5,
  1280: 593.5,
  1440: 593.5,
};

async function boxes(page: Page) {
  const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
  return {
    court: await box(".board-court"),
    count: await box(".board-top"),
    sentence: await box(".board-step"),
    steps: await box(".board-steps"),
    link: await box(".board-edit"),
  };
}

for (const [screen, w] of Object.entries(widths).map(([s, w]) => [Number(s), w] as const)) {
  test(`${screen} px: the court is ${w} px wide, 216 by 174`, async ({ page }) => {
    await page.setViewportSize({ width: screen, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const { court } = await boxes(page);
    expect(court.width).toBeCloseTo(w, 0);
    expect(court.height).toBeCloseTo((w * 174) / 216, 0);
  });
}

for (const path of ["/", "/en/"]) {
  for (const screen of [393, 1280]) {
    test(`${path} at ${screen} px: nothing in the hero moves when the fonts load`, async ({ page }) => {
      await page.setViewportSize({ width: screen, height: 900 });
      // Without the fonts (woff2 and the woff fallback): as before they load.
      await page.route("**/*.{woff,woff2}", (route) => route.abort());
      await page.goto(path);
      const before = await boxes(page);
      expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === "loaded"))).toBe(false);

      await page.unroute("**/*.{woff,woff2}");
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const after = await boxes(page);
      for (const part of ["court", "count", "sentence", "steps", "link"] as const) {
        for (const key of ["x", "y", "height"] as const) expect(after[part][key], `${part} ${key}`).toBeCloseTo(before[part][key], 0);
      }
    });
  }
}

// A laptop: the whole hero on the first screen, the link included.
for (const [width, height] of [
  [1280, 800],
  [1366, 768],
] as const) {
  test(`${width}×${height}: the whole hero is on a laptop's first screen`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const [part, b] of Object.entries(await boxes(page))) {
      expect(b.y, part).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, part).toBeLessThanOrEqual(height);
    }
  });
}

// A phone, in the projects' own windows (Pixel 7: 412 × 839; iPhone 15: 393 × 659):
// the court, the counter with the play button and the sentence on the first screen.
for (const path of ["/", "/en/"]) {
  test(`${path}: the court, the counter and the sentence are on the phone's first screen`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(() => window.innerHeight);
    const { court, count, sentence } = await boxes(page);
    for (const [part, b] of Object.entries({ court, count, sentence })) expect(b.y + b.height, part).toBeLessThanOrEqual(height);
  });
}
