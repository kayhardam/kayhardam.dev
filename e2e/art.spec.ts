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
