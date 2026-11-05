import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The images from Coachboard (phase 3): the KH logo, since phase 10 with the
// ball, and the section numbers; the pass and the field lines went in phase 10.
// All decoration: hidden, and nothing to click. The one exception is the
// board's court (phase 4): an image with its label.

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
  // letter-spacing (the header's 0.06em) pulls it apart, "K H" instead of "KH".
  test(`${path}: no label in an SVG inherits letter-spacing`, async ({ page }) => {
    await page.goto(path);
    const labels = await page.locator("svg text").evaluateAll((all) =>
      all.map((text) => {
        const where = text.closest(".site-header") ? "header" : text.closest(".board") ? "board" : text.closest(".contact") ? "contact" : "section";
        return { where, text: text.textContent, letterSpacing: getComputedStyle(text).letterSpacing };
      }),
    );
    // The logo, the seven players on the board, the numbers 1 and 2, and at Contact number 3.
    expect(labels.filter((l) => l.where === "header").map((l) => l.text)).toEqual(["KH"]);
    expect(labels.filter((l) => l.where === "board")).toHaveLength(7);
    expect(labels.filter((l) => l.where === "section").map((l) => l.text)).toEqual(["1", "2"]);
    expect(labels.filter((l) => l.where === "contact").map((l) => l.text)).toEqual(["3"]);
    expect(labels.filter((l) => !["normal", "0px"].includes(l.letterSpacing))).toEqual([]);
  });

  // The player in ink blue with the white label KH, and the ball: the page's colour
  // with an ink-blue edge, so it cuts into the player's edge (phase 10).
  test(`${path}: the logo: 37 by 34 px, in the link kayhardam.dev, the label KH and the ball`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole("link", { name: t.site, exact: true });
    await expect(link).toHaveAccessibleName(t.site);
    const logo = link.locator("svg");
    await expect(logo).toHaveAttribute("aria-hidden", "true");
    await expect(logo.locator("text")).toHaveText("KH");
    await expect(logo.locator("text")).toHaveAttribute("fill", "#FFFFFF");
    const circles = await logo.locator("circle").evaluateAll((all) => all.map((c) => [c.getAttribute("fill"), c.getAttribute("stroke")]));
    expect(circles).toEqual([
      ["#1E40AF", "#FFFFFF"],
      ["#FDFBF8", "#1E40AF"],
    ]);
    const box = (await logo.boundingBox())!;
    expect(box.width).toBeCloseTo(37, 0);
    expect(box.height).toBeCloseTo(34, 0);
  });
}

for (const { path } of pages) {
  test(`${path}: three section numbers, 36 px, above the heading of their section`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const numbers = await page.locator(".section-number").evaluateAll((all) =>
      all.map((svg) => {
        const box = svg.getBoundingClientRect();
        const section = svg.closest("section")!;
        const h2 = section.querySelector("h2")!.getBoundingClientRect();
        return {
          label: svg.querySelector("text")!.textContent,
          section: section.className,
          width: box.width,
          height: box.height,
          gap: Math.round(h2.top - box.bottom),
          fill: svg.querySelectorAll("circle")[svg.querySelectorAll("circle").length - 1]!.getAttribute("fill"),
          ink: svg.querySelector("text")!.getAttribute("fill"),
        };
      }),
    );
    expect(numbers).toEqual([
      { label: "1", section: expect.stringMatching(/coachboard/), width: 36, height: 36, gap: 16, fill: "#1E40AF", ink: "#FFFFFF" },
      { label: "2", section: expect.stringMatching(/about/), width: 36, height: 36, gap: 16, fill: "#1E40AF", ink: "#FFFFFF" },
      { label: "3", section: expect.stringMatching(/contact/), width: 36, height: 36, gap: 16, fill: "#1E40AF", ink: "#FFFFFF" },
    ]);
  });
}

// Layout shifts while loading, with the fonts arriving late. Only Chromium:
// WebKit has no Layout Instability API. The statement may still shift (phase 2,
// CLS 0.028), and what is below it moves along; the header, the card, the button
// and the numbers may not shift on their own. The statement may have a line more
// or less in the fallback font, so the Coachboard section moves when Plus Jakarta
// Sans comes, with number 1 in it. Each shift's rects tell how far: the numbers
// may move only as far as the statement grew or shrank, straight up or down.
// From 860 px the button is under the statement (phase 9), so there it may move
// along too, the same way; on the phone it is above the statement and may not.
type Shift = { html: string; dx: number; dy: number; below: boolean };
for (const path of ["/", "/en/"]) {
  for (const width of [393, 1280]) {
    test(`${path} at ${width} px: no layout shift in the header, the card or the numbers`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "WebKit has no Layout Instability API");
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        const shifts: Shift[] = [];
        const w = window as unknown as { shifts: Shift[]; statementBefore: number };
        w.shifts = shifts;
        // The statement's height in the fallback font: the fonts come 500 ms later.
        document.addEventListener("DOMContentLoaded", () => {
          w.statementBefore = document.querySelector(".statement")!.getBoundingClientRect().height;
        });
        const protectedParts = "header, .board, .hero-button, .section-number";
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { sources: { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] }[]) {
            for (const { node, previousRect, currentRect } of entry.sources) {
              const el = node instanceof Element ? node : node?.parentElement;
              if (!el?.closest(protectedParts)) continue;
              shifts.push({
                html: el.outerHTML.slice(0, 80),
                dx: currentRect.x - previousRect.x,
                dy: currentRect.y - previousRect.y,
                // Below the statement in the page: the numbers, and from 860 px the button; not
                // the header or the card.
                below: !!el.closest(".section-number") || (innerWidth >= 860 && !!el.closest(".hero-button")),
              });
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
      const { shifts, statementBefore } = await page.evaluate(() => {
        const w = window as unknown as { shifts: Shift[]; statementBefore: number };
        return { shifts: w.shifts, statementBefore: w.statementBefore };
      });
      const statementAfter = await page.locator(".statement").evaluate((el) => el.getBoundingClientRect().height);
      const grew = statementAfter - statementBefore;
      const onTheirOwn = shifts.filter((s) => !s.below || Math.abs(s.dx) > 1 || Math.abs(s.dy - grew) > 1);
      expect(onTheirOwn.map((s) => `${s.html} (${s.dx}, ${s.dy}; the statement ${grew})`)).toEqual([]);
    });
  }
}
