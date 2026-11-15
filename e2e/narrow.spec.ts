import { expect, test } from "./helpers";

// Narrow phones: nothing sticks out, the step lines keep their height and fit,
// the email address stays on one line.

const widths = [320, 340, 360, 375, 390, 393, 412, 430];

for (const path of ["/", "/en/"]) {
  for (const width of widths) {
    test(`${path} at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const outside = await page.evaluate(() =>
        [...document.body.querySelectorAll("*")]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
      );
      expect(outside).toEqual([]);

      // The step lines: 48 px each, on one line, with nothing cut off.
      const lines = await page.locator(".board-steps button").evaluateAll((all) =>
        all.map((b) => ({ height: b.getBoundingClientRect().height, fits: b.scrollWidth <= b.clientWidth && b.scrollHeight <= b.clientHeight })),
      );
      expect(lines).toEqual(Array(4).fill({ height: 48, fits: true }));

      // One line: every piece of the address has the same top.
      const tops = await page.locator(".email").evaluate((a) => {
        const range = document.createRange();
        range.selectNodeContents(a);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      });
      expect(tops).toBe(1);
    });
  }
}

/** The header: 10 + 44 + 10 px and its line, the name and the button in one row, the name not cut off. */
async function header(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const middle = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    };
    const name = document.querySelector(".site-header .name")!;
    const talk = document.querySelector(".site-header .talk")!;
    return {
      height: document.querySelector(".site-header")!.getBoundingClientRect().height,
      sameRow: Math.abs(middle(name) - middle(talk)) < 1,
      cut: name.scrollWidth > name.clientWidth || talk.scrollWidth > talk.clientWidth,
    };
  });
}

for (const path of ["/", "/en/"]) {
  for (const width of [...widths, 560, 1280]) {
    test(`${path} at ${width} px: the header is 65 px, with the name and the button`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await header(page)).toEqual({ height: 65, sameRow: true, cut: false });
      // The language switch: in the header from 560 px, at the page's foot below it.
      await expect(page.locator(".site-header .languages")).toBeVisible({ visible: width >= 560 });
      await expect(page.locator(".close .languages")).toBeVisible({ visible: width < 560 });
    });
  }

  // Before the font loads, the text may be wider: the name is cut off, the page doesn't scroll.
  for (const width of [320, 340, 360, 375]) {
    test(`${path} at ${width} px without the fonts: no horizontal scroll`, async ({ page }) => {
      await page.route("**/*.{woff,woff2}", (route) => route.abort());
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === "loaded"))).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await header(page)).height).toBe(65);
    });
  }
}
