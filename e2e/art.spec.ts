import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The images from Coachboard (phase 3): the KH logo, the section numbers, the
// pass, the field lines and the shot. All decoration: hidden, and nothing to click.

const pages = [
  { path: "/", t: nl },
  { path: "/en/", t: en },
];

for (const { path, t } of pages) {
  test(`${path}: every SVG is hidden and has nothing to click`, async ({ page }) => {
    await page.goto(path);
    const svgs = await page.locator("svg").evaluateAll((all) =>
      all.map((svg) => ({
        hidden: svg.closest('[aria-hidden="true"]') !== null,
        focusable: svg.querySelector("a, button, [tabindex]") !== null,
      })),
    );
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) expect(svg).toEqual({ hidden: true, focusable: false });
  });

  test(`${path}: the logo: 34 px, in the link kayhardam.dev, with the label KH`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole("link", { name: t.site, exact: true });
    await expect(link).toHaveAccessibleName(t.site);
    const logo = link.locator("svg");
    await expect(logo).toHaveAttribute("aria-hidden", "true");
    await expect(logo.locator("text")).toHaveText("KH");
    const box = (await logo.boundingBox())!;
    expect(box.width).toBeCloseTo(34, 0);
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
        const section = svg.closest("section, footer")!;
        const h2 = section.querySelector("h2")!.getBoundingClientRect();
        return {
          label: svg.querySelector("text")!.textContent,
          section: section.className,
          width: box.width,
          height: box.height,
          gap: Math.round(h2.top - box.bottom),
          fill: svg.querySelectorAll("circle")[svg.querySelectorAll("circle").length - 1]!.getAttribute("fill"),
        };
      }),
    );
    expect(numbers).toEqual([
      { label: "1", section: expect.stringMatching(/coachboard/), width: 36, height: 36, gap: 16, fill: "#15803D" },
      { label: "2", section: expect.stringMatching(/about/), width: 36, height: 36, gap: 16, fill: "#FFFFFF" },
      { label: "3", section: expect.stringMatching(/contact/), width: 36, height: 36, gap: 16, fill: "#15803D" },
    ]);
  });
}

// The pass: from the hero to number 1, its point 16 px above the number.
for (const width of [320, 393, 430, 559, 560, 859, 860, 1024, 1280]) {
  test(`${width} px: the pass runs from the hero to number 1`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const box = (selector: string) =>
      page.locator(selector).first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height, right: r.right, bottom: r.bottom + window.scrollY };
      });
    const pass = await box(".pass");
    const number = await box(".coachboard .section-number");
    const hero = await box(".hero");
    const section = await box(".coachboard");
    const statement = await box(".statement");

    expect(Math.abs(pass.x + pass.width / 2 - (number.x + number.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(number.y - pass.bottom - 16)).toBeLessThanOrEqual(1);
    expect(pass.y).toBeGreaterThan(hero.y);
    expect(pass.y).toBeLessThan(hero.bottom);
    expect(pass.bottom).toBeGreaterThan(section.y);
    if (width < 860) expect(Math.abs(pass.y - statement.bottom - 32)).toBeLessThanOrEqual(1);

    for (const selector of [".board", ".hero-button", "h1", ".statement", ".coachboard h2"]) {
      const other = await box(selector);
      const overlaps =
        pass.x < other.right && other.x < pass.right && pass.y < other.bottom && other.y < pass.bottom;
      expect(overlaps, selector).toBe(false);
    }
  });
}

// The field lines: in the hero only from 860 px, in About me on every width.
for (const width of [320, 393, 430, 768, 859, 860, 1024, 1280]) {
  test(`${width} px: the field lines`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const lines = await page.locator(".field-lines").evaluateAll((all) =>
      all.map((wrapper) => {
        const section = wrapper.parentElement!.getBoundingClientRect();
        const box = wrapper.getBoundingClientRect();
        const svg = wrapper.querySelector("svg")!.getBoundingClientRect();
        return {
          section: wrapper.parentElement!.className,
          visible: getComputedStyle(wrapper).display !== "none" && svg.width > 0,
          sameBox: [box.x - section.x, box.y - section.y, box.width - section.width, box.height - section.height].every((d) => Math.abs(d) < 0.5),
          overflow: getComputedStyle(wrapper).overflow,
          hidden: wrapper.getAttribute("aria-hidden"),
        };
      }),
    );
    expect(lines).toEqual([
      expect.objectContaining({ section: expect.stringMatching(/hero/), visible: width >= 860, hidden: "true" }),
      { section: expect.stringMatching(/about/), visible: true, sameBox: true, overflow: "clip", hidden: "true" },
    ]);
    if (width >= 860) expect(lines[0]).toMatchObject({ sameBox: true, overflow: "clip" });

    // The lines block no click: the middle of each link gives the link itself.
    for (const selector of [".hero-button", ".outline-button", ".email"]) {
      const hit = await page.locator(selector).evaluate((a) => {
        a.scrollIntoView({ block: "center" });
        const r = a.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest("a") === a;
      });
      expect(hit, selector).toBe(true);
    }
  });
}

for (const width of [320, 393, 1280]) {
  test(`${width} px: the shot on goal, in the footer before number 3`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const shot = await page.locator(".shot").evaluate((svg) => ({
      inFooter: svg.closest("footer") !== null,
      beforeNumber: (svg.compareDocumentPosition(document.querySelector("footer .section-number")!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      label: svg.querySelector("text")?.textContent,
      width: svg.getBoundingClientRect().width,
    }));
    expect(shot).toMatchObject({ inFooter: true, beforeNumber: true, label: "KH" });
    expect(shot.width).toBeLessThanOrEqual(420);
    expect(shot.width).toBeCloseTo(Math.min(420, width - 2 * (width < 560 ? 16 : 24)), 0);
  });
}

// Layout shifts while loading, with the fonts arriving late. Only Chromium:
// WebKit has no Layout Instability API. The statement may still shift (phase 2,
// CLS 0.028), and what is below it moves along; the header, the card, the button,
// the numbers and the pass may not shift on their own.
for (const width of [393, 1280]) {
  test(`${width} px: no layout shift in the header, the card, the numbers or the pass`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "WebKit has no Layout Instability API");
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const sources: string[] = [];
      (window as unknown as { shifts: string[] }).shifts = sources;
      const protectedParts = "header, .board, .hero-button, .section-number, .pass";
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { sources: { node?: Node }[] }[]) {
          for (const { node } of entry.sources) {
            const el = node instanceof Element ? node : node?.parentElement;
            // Only a shift of these parts themselves: the Coachboard section may move as a
            // whole with the statement (plan, chapter 7), the pass and number 1 with it.
            if (el?.closest(protectedParts)) sources.push(el.outerHTML.slice(0, 80));
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.route("**/*.woff2", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { shifts: string[] }).shifts)).toEqual([]);
  });
}
