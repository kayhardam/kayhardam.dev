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
      // The field lines in About me stick out on purpose; their wrapper clips them and counts.
      const outside = await page.evaluate(() =>
        [...document.body.querySelectorAll("*")]
          .filter((el) => !el.closest(".field-lines > svg"))
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

/** The header: 77 px, the logo and the language switch in one row, the logo 34 px. */
async function header(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const middle = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    };
    const logo = document.querySelector(".site-header .logo svg")!;
    const nav = document.querySelector(".site-header nav")!;
    return {
      height: document.querySelector(".site-header")!.getBoundingClientRect().height,
      sameRow: Math.abs(middle(logo) - middle(nav)) < 1,
      logo: logo.getBoundingClientRect().width,
    };
  });
}

for (const path of ["/", "/en/"]) {
  for (const width of [...widths, 1280]) {
    test(`${path} at ${width} px: the header with the logo stays 77 px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await header(page)).toEqual({ height: 77, sameRow: true, logo: 34 });
    });
  }

  // Before Barlow loads, the text is wider: it is cut off, the page doesn't scroll.
  for (const width of [320, 340, 360, 375]) {
    test(`${path} at ${width} px without the fonts: no horizontal scroll`, async ({ page }) => {
      await page.route("**/*.{woff,woff2}", (route) => route.abort());
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === "loaded"))).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await header(page)).height).toBe(77);
    });
  }
}
