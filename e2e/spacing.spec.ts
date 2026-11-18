import { expect, test } from "./helpers";

// WCAG 1.4.12 Text Spacing: with a reader's own spacing (line height 1.5, letters 0.12em,
// words 0.16em, 2em after a paragraph) no part of a step line covers another. The start
// coordinate ran over the arrow, and where the arrow goes into the kind (18 November 2026).
// Without that spacing the parts are clear of each other too, on one line of 48 px.

// A reader's style sheet or bookmarklet is not bound by the page's CSP.
test.use({ bypassCSP: true, reducedMotion: "reduce" });

const SPACING =
  "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }";

/** Per step line, how far each part's text runs into the next part (px; negative: clear), and the line's height. */
const lines = () =>
  [...document.querySelectorAll(".board-steps button")].map((button) => {
    const text = (selector: string) => {
      const range = document.createRange();
      range.selectNodeContents(button.querySelector(selector)!);
      return range.getBoundingClientRect();
    };
    const [n, from, to, kind] = [".n", ".from", ".to", ".kind"].map(text) as [DOMRect, DOMRect, DOMRect, DOMRect];
    const arrow = button.querySelector(".data svg")!.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    return {
      over: [n.right - from.left, from.right - arrow.left, arrow.right - to.left, to.right - kind.left, kind.right - box.right].map((v) => Math.round(v * 10) / 10),
      height: box.height,
    };
  });

for (const path of ["/", "/en/"]) {
  for (const width of [320, 360, 390, 560, 860, 1024, 1440]) {
    test(`${path} at ${width} px: the step lines' parts stay clear of each other, also with a reader's text spacing`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      for (const { over, height } of await page.evaluate(lines)) {
        for (const v of over) expect(v, `${over}`).toBeLessThanOrEqual(0);
        expect(height).toBe(48);
      }
      await page.addStyleTag({ content: SPACING });
      for (const { over } of await page.evaluate(lines)) {
        for (const v of over) expect(v, `spaced: ${over}`).toBeLessThanOrEqual(0);
      }
      // Nothing sticks out of the page either.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
}
