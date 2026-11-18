import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The SVGs on the page: since Hars (15 November 2026) the board's (the court, the
// ball's rings and label), the step lines' arrows and the lens's layer. All
// decoration: hidden, and nothing to click. The one exception is the board's
// court (phase 4): an image with its label.

const pages = [
  { path: "/", t: nl },
  { path: "/en/", t: en },
];

for (const { path, t } of pages) {
  test(`${path}: every SVG but the court is hidden, and none has anything to click`, async ({ page }) => {
    await page.goto(path);
    const svgs = await page.locator("svg").evaluateAll((all) =>
      all.map((svg) => ({
        hidden: svg.closest('[aria-hidden="true"]') !== null,
        focusable: svg.querySelector("a, button, [tabindex]") !== null,
        role: svg.getAttribute("role"),
        label: svg.getAttribute("aria-label"),
      })),
    );
    expect(svgs.length).toBeGreaterThan(0);
    const shown = svgs.filter((svg) => !svg.hidden);
    expect(shown).toEqual([{ hidden: false, focusable: false, role: "img", label: t.board.court }]);
    for (const svg of svgs.filter((svg) => svg.hidden)) expect(svg.focusable).toBe(false);
  });

  // A label in an SVG is in user units, scaled with its SVG: an inherited
  // letter-spacing (the counter's 0.06em) pulls it apart, "A I" instead of "AI".
  test(`${path}: no label in an SVG inherits letter-spacing`, async ({ page }) => {
    await page.goto(path);
    const labels = await page.locator("svg text").evaluateAll((all) =>
      all.map((text) => {
        const where = text.closest(".board") ? "board" : "elsewhere";
        return { where, text: text.textContent, letterSpacing: getComputedStyle(text).letterSpacing };
      }),
    );
    // Since Hars only on the board: the seven labels of players, and the ball's.
    expect(labels.filter((l) => l.where === "board")).toHaveLength(8);
    expect(labels.filter((l) => l.where === "elsewhere")).toEqual([]);
    expect(labels.filter((l) => !["normal", "0px"].includes(l.letterSpacing))).toEqual([]);
  });
}

// Layout shifts while loading, with the fonts arriving late. Only Chromium:
// WebKit has no Layout Instability API. Since Hars (15 November 2026) the hero
// has fixed heights: the court a fixed ratio, the sentence its two lines (three
// for a longer one), the counter and the step lines their own. So nothing in the
// header or the hero may shift at all.
type Shift = { html: string; dx: number; dy: number };
for (const path of ["/", "/en/"]) {
  for (const width of [393, 1280]) {
    test(`${path} at ${width} px: no layout shift in the header or the hero`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "WebKit has no Layout Instability API");
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        const shifts: Shift[] = [];
        (window as unknown as { shifts: Shift[] }).shifts = shifts;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { sources: { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] }[]) {
            for (const { node, previousRect, currentRect } of entry.sources) {
              const el = node instanceof Element ? node : node?.parentElement;
              if (!el?.closest("header, .hero")) continue;
              shifts.push({ html: el.outerHTML.slice(0, 80), dx: currentRect.x - previousRect.x, dy: currentRect.y - previousRect.y });
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.route("**/*.woff2", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const shifts = await page.evaluate(() => (window as unknown as { shifts: Shift[] }).shifts);
      expect(shifts.map((s) => `${s.html} (${s.dx}, ${s.dy})`)).toEqual([]);
    });
  }
}
