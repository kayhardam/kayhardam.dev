import { expect, test } from "./helpers";

// Narrow phones: nothing sticks out, the hero button keeps its height, the
// email address stays on one line.

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

      // Exactly 56 px, with one or two lines that fit inside.
      const button = await page.locator(".hero-button").evaluate((a) => ({
        height: a.getBoundingClientRect().height,
        fits: a.scrollHeight <= a.clientHeight,
      }));
      expect(button).toEqual({ height: 56, fits: true });

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
