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
    const heights = await page.locator("a, button").evaluateAll((all) =>
      all.map((el) => [el.textContent?.trim() || el.getAttribute("aria-label") || "", el.getBoundingClientRect().height] as const),
    );
    for (const [name, height] of heights) expect(height, name).toBeGreaterThanOrEqual(44);
  });

  // One grey ring on every background: 3:1 on navy, #1E293B, white and the card (Kay, phase 8).
  // Tab reaches every link and button.
  test(`${path}: the focus ring is 3 px of #64748B, 2 px out`, async ({ page, browserName }) => {
    await page.goto(path);
    // Safari tabs to links only with Option (Alt) held.
    const key = browserName === "webkit" ? "Alt+Tab" : "Tab";
    const count = await page.locator("a, button").count();
    const rings: { name: string; outline: string; offset: string }[] = [];
    for (let i = 0; i < count; i++) {
      await page.keyboard.press(key);
      const ring = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return { name: el.textContent?.trim() || el.getAttribute("aria-label") || el.tagName, outline: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`, offset: s.outlineOffset };
      });
      if (ring) rings.push(ring);
    }
    expect(rings.length).toBe(count);
    for (const { name, outline, offset } of rings) expect({ outline, offset }, name).toEqual({ outline: "3px solid rgb(100, 116, 139)", offset: "2px" });
  });
}
