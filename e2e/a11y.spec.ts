import AxeBuilder from "@axe-core/playwright";
import { allPages, expect, missingPages, test } from "./helpers";

// axe on every page (WCAG 2.x A and AA, contrast included), and the touch targets.

for (const path of [...allPages(), missingPages[0]!]) {
  test(`${path}: no axe violations`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });

  test(`${path}: every link and button is at least 44 px high`, async ({ page }) => {
    await page.goto(path);
    // Every link and button on the screen: the language switch has one place per width (display: none at the other).
    const heights = await page.locator("a, button").evaluateAll((all) =>
      all.filter((el) => el.checkVisibility()).map((el) => [el.textContent?.trim() || el.getAttribute("aria-label") || "", el.getBoundingClientRect().height] as const),
    );
    for (const [name, height] of heights) expect(height, name).toBeGreaterThanOrEqual(44);
  });

  // The ring of Hars (Kay, 15 November 2026): 3 px amber, 2 px out, with an espresso edge around it (the shadow).
  // Tab reaches every link and button.
  test(`${path}: the focus ring is 3 px of amber, 2 px out, with an espresso edge`, async ({ page, browserName }) => {
    await page.goto(path);
    // Safari tabs to links only with Option (Alt) held.
    const key = browserName === "webkit" ? "Alt+Tab" : "Tab";
    const count = await page.locator("a, button").evaluateAll((all) => all.filter((el) => el.checkVisibility()).length);
    const rings: { name: string; outline: string; offset: string; edge: string }[] = [];
    for (let i = 0; i < count; i++) {
      await page.keyboard.press(key);
      const ring = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return { name: el.textContent?.trim() || el.getAttribute("aria-label") || el.tagName, outline: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`, offset: s.outlineOffset, edge: s.boxShadow };
      });
      if (ring) rings.push(ring);
    }
    expect(rings.length).toBe(count);
    for (const { name, outline, offset, edge } of rings) {
      expect({ outline, offset, edge }, name).toEqual({ outline: "3px solid rgb(255, 179, 0)", offset: "2px", edge: "rgb(22, 17, 13) 0px 0px 0px 7px" });
    }
  });
}
