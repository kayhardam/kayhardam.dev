import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

// The board card has its final size from phase 2 on, while it is still empty.
// Its height depends only on its width B (src/components/board/board.css):
//   H = 131.6 + foot + (B − 28) × 174/216, with the foot 44 px from B = 420, else 76.
// This test stays the same in phase 4: if it stays green, nothing shifts.

/** Screen width → card width, from the plan. */
const widths: Record<number, number> = {
  320: 288,
  360: 328,
  390: 358,
  393: 361,
  412: 380,
  430: 398,
  559: 527,
  560: 512,
  859: 560,
  860: 374,
  1024: 456,
  1280: 544,
  1440: 544,
};

const expectedHeight = (b: number) => 131.6 + (b >= 420 ? 44 : 76) + ((b - 28) * 174) / 216;

async function boxes(page: Page) {
  const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
  return { board: await box(".board"), button: await box(".hero-button"), name: await box("h1") };
}

for (const [screen, b] of Object.entries(widths).map(([s, w]) => [Number(s), w] as const)) {
  test(`${screen} px: the card is ${b} px wide, with the height of the formula`, async ({ page }) => {
    await page.setViewportSize({ width: screen, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const { board, button, name } = await boxes(page);
    expect(board.width).toBeCloseTo(b, 0);
    expect(board.width).toBeLessThanOrEqual(560);
    expect(Math.abs(board.height - expectedHeight(board.width))).toBeLessThanOrEqual(1);
    expect(button.y - (board.y + board.height)).toBeCloseTo(16, 0);

    if (screen < 860) {
      // Above the name.
      expect(board.y + board.height).toBeLessThan(name.y);
    } else {
      // Beside the name: to the right of it, in the same row.
      expect(board.x).toBeGreaterThan(name.x + name.width);
      expect(board.y).toBeLessThan(name.y + name.height);
      expect(board.y + board.height).toBeGreaterThan(name.y);
    }
  });
}

for (const screen of [393, 1280]) {
  test(`${screen} px: the card doesn't move when the fonts load`, async ({ page }) => {
    await page.setViewportSize({ width: screen, height: 900 });
    // Without the fonts (woff2 and the woff fallback): as before they load.
    await page.route("**/*.{woff,woff2}", (route) => route.abort());
    await page.goto("/");
    const before = await boxes(page);
    expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === "loaded"))).toBe(false);

    await page.unroute("**/*.{woff,woff2}");
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const after = await boxes(page);
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(after.board[key], key).toBeCloseTo(before.board[key], 0);
      expect(after.button[key], key).toBeCloseTo(before.button[key], 0);
    }
  });
}

test("1280×800: the photo, the name, the statement, the board and the button are on a laptop's first screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const { button } = await boxes(page);
  expect(button.y + button.height).toBeLessThanOrEqual(800);
  for (const selector of [".hero img", "h1", ".statement", ".board"]) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.y, selector).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, selector).toBeLessThanOrEqual(800);
  }
});

// In the projects' own windows. Pixel 7 (412 × 839) has room; in Safari on an iPhone 15
// (393 × 659) the photo starts just below the edge, and that is accepted (Kay, phase 8).
for (const path of ["/", "/en/"]) {
  test(`${path}: the photo and the name are on the first screen`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "Safari's window on an iPhone is too short (Kay, phase 8)");
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(() => window.innerHeight);
    for (const selector of [".hero img", "h1"]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.y + box.height, selector).toBeLessThanOrEqual(height);
    }
  });
}

test("the whole card and the button are on the first screen", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const { button } = await boxes(page);
  const height = await page.evaluate(() => window.innerHeight);
  expect(button.y + button.height).toBeLessThanOrEqual(height);
});
