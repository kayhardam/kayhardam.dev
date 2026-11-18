import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { allPages, expect, missingPages, test } from "./helpers";

// The hero's buttons are off until its island has mounted: wait for it before tabbing, or Tab skips them.
const hydrated = async (page: Page) => {
  const play = page.locator(".board-top .play");
  if (await play.count()) await expect(play).toBeEnabled();
};

// axe on every page (WCAG 2.0, 2.1 and 2.2, A and AA, contrast included), the touch targets and the focus.

for (const path of [...allPages(), missingPages[0]!]) {
  // At the project's phone width and at a laptop's: there the language switch is in the header
  // and the hero has two columns.
  for (const laptop of [false, true]) {
    const at = laptop ? " at 1280 px" : "";
    const open = async (page: Page) => {
      if (laptop) await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(path);
    };

    test(`${path}${at}: no axe violations`, async ({ page }) => {
      await open(page);
      await page.evaluate(() => document.fonts.ready);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    });

    test(`${path}${at}: every link and button is at least 44 × 44 px`, async ({ page }) => {
      await open(page);
      // Every link and button on the screen: the language switch has one place per width (display: none at the other).
      const sizes = await page.locator("a, button").evaluateAll((all) =>
        all
          .filter((el) => el.checkVisibility())
          .map((el) => {
            const r = el.getBoundingClientRect();
            return [el.textContent?.trim() || el.getAttribute("aria-label") || "", r.width, r.height] as const;
          }),
      );
      expect(sizes.length).toBeGreaterThan(0);
      for (const [name, width, height] of sizes) {
        expect(width, name).toBeGreaterThanOrEqual(44);
        expect(height, name).toBeGreaterThanOrEqual(44);
      }
    });
  }

  // The ring of Hars (Kay, 15 November 2026): 3 px amber, 2 px out, with an espresso edge around it (the shadow).
  // Tab reaches every link and button and the lens's frame, in the page's order, and each has the ring.
  test(`${path}: Tab reaches every stop in order, each with the ring: 3 px of amber, 2 px out, with an espresso edge`, async ({ page, browserName }) => {
    await page.goto(path);
    await hydrated(page);
    // Safari tabs to links only with Option (Alt) held.
    const key = browserName === "webkit" ? "Alt+Tab" : "Tab";
    // The stops the page should have, numbered in its own order.
    const count = await page.locator('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])').evaluateAll((all) => {
      const stops = all.filter((el) => el.checkVisibility());
      stops.forEach((el, i) => el.setAttribute("data-stop", String(i)));
      return stops.length;
    });
    const rings: { stop: string | null; name: string; outline: string; offset: string; edge: string }[] = [];
    for (let i = 0; i < count; i++) {
      await page.keyboard.press(key);
      const ring = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return {
          stop: el.getAttribute("data-stop"),
          name: el.textContent?.trim().slice(0, 30) || el.getAttribute("aria-label") || el.tagName,
          outline: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`,
          offset: s.outlineOffset,
          edge: s.boxShadow,
        };
      });
      if (ring) rings.push(ring);
    }
    expect(rings.map((r) => r.stop)).toEqual(Array.from({ length: count }, (_, i) => String(i)));
    for (const { name, outline, offset, edge } of rings) {
      expect({ outline, offset, edge }, name).toEqual({ outline: "3px solid rgb(255, 179, 0)", offset: "2px", edge: "rgb(22, 17, 13) 0px 0px 0px 7px" });
    }
  });

  // WCAG 2.2, 2.4.11 Focus Not Obscured: the sticky header never covers what has the focus. The
  // browser scrolls a focused element to the screen's edge as if the header weren't there; only
  // scroll-padding-top (base.css) tells it. Going back up is where it shows: Shift+Tab put a
  // step line at the very top, wholly under the header (18 November 2026).
  test(`${path}: the header never covers the element that has the focus`, async ({ page, browserName }) => {
    await page.goto(path);
    await hydrated(page);
    const key = browserName === "webkit" ? "Alt+Tab" : "Tab";
    const back = browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab";
    // Every link and button, and the lens's frame.
    const stops = await page.locator("a, button, [tabindex]").evaluateAll((all) => all.filter((el) => el.checkVisibility()).length);
    const covered: string[] = [];
    let seen = 0;
    const look = async (way: string) => {
      const found = await page.evaluate(() => {
        const el = document.activeElement;
        const header = document.querySelector(".site-header");
        if (!el || el === document.body || !header || header.contains(el)) return null;
        const r = el.getBoundingClientRect();
        return { name: el.textContent?.trim().slice(0, 30) || el.getAttribute("aria-label") || el.tagName, top: r.top, under: header.getBoundingClientRect().bottom };
      });
      if (!found) return;
      seen++;
      if (found.top < found.under - 0.5) covered.push(`${way} ${found.name}: top ${found.top}, header to ${found.under}`);
    };
    for (let i = 0; i < stops; i++) {
      await page.keyboard.press(key);
      await look("forward");
    }
    for (let i = 0; i < stops; i++) {
      await page.keyboard.press(back);
      await look("back");
    }
    expect(covered).toEqual([]);
    // The check saw the page's elements, twice over (the 404 page has no header to hide under).
    if (await page.locator(".site-header").count()) expect(seen).toBeGreaterThan(stops);
  });
}
