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

  test(`${path}: every link is at least 44 px high`, async ({ page }) => {
    await page.goto(path);
    const heights = await page.locator("a").evaluateAll((links) =>
      links.map((a) => [a.textContent?.trim(), a.getBoundingClientRect().height] as const),
    );
    for (const [name, height] of heights) expect(height, name).toBeGreaterThanOrEqual(44);
  });
}
