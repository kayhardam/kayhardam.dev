import { coachboard, email, mailto } from "../src/data/links";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The holding page (Kay, 20 November 2026), in each language: its texts and links, no
// script, the palette Inkt, nothing sticking out from 320 to 1440 px, and a statement that
// keeps its size whichever font has loaded. Runs only while src/pages/index.astro shows
// Holding.astro (playwright.config.ts); the full page's specs don't run then.

const pages = [
  { path: "/", t: nl, locale: "nl" as const },
  { path: "/en/", t: en, locale: "en" as const },
];

for (const { path, t, locale } of pages) {
  test(`${path}: every text is on the page, and nothing of the full page`, async ({ page }) => {
    await page.goto(path);
    const sentences = t.holding.statement.map((lines) => lines.join(" "));
    for (const value of [t.name, ...sentences, t.holding.product, t.holding.button, email]) {
      await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
    }
    // The name is the only heading: the statement is a paragraph.
    await expect(page.locator("h1, h2, h3, h4, h5, h6")).toHaveText([t.name]);
    for (const value of [t.talk, t.hero.button, t.lens.heading, t.work.heading, t.close.heading]) {
      await expect(page.getByText(value, { exact: true })).toHaveCount(0);
    }
  });

  test(`${path}: every link has its name and address`, async ({ page }) => {
    await page.goto(path);
    const home = locale === "nl" ? "/" : "/en/";
    const links = [
      [t.name, home],
      ["NL", "/"],
      ["EN", "/en/"],
      [t.holding.button, coachboard[locale]],
      [email, mailto],
    ];
    await expect(page.getByRole("link")).toHaveCount(links.length);
    for (const [name, href] of links) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href!);
    }
    await expect(page.locator("a[rel]")).toHaveCount(0);
  });

  // No JavaScript at all: the JSON-LD is a data block, not a script a browser runs.
  test(`${path}: no script and no island`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(0);
    await expect(page.locator("astro-island")).toHaveCount(0);
  });

  // The palette Inkt (Kay, 20 November 2026): the ground papier, the stage linnen, the statement's
  // first sentence in inkt and its second in ink blue, the foot ink blue with the address in papier.
  test(`${path}: the page is in Inkt`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-palette", "inkt");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#fdfbf8");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(253, 251, 248)");
    await expect(page.locator(".site-header")).toHaveCSS("background-color", "rgb(253, 251, 248)");
    await expect(page.locator(".who")).toHaveCSS("background-color", "rgb(245, 241, 235)");
    const colours = await page.locator(".statement .sentence").evaluateAll((all) => all.map((s) => getComputedStyle(s).color));
    expect(colours).toEqual(["rgb(31, 26, 23)", "rgb(30, 64, 175)"]);
    await expect(page.locator(".close")).toHaveCSS("background-color", "rgb(30, 64, 175)");
    await expect(page.locator(".email")).toHaveCSS("color", "rgb(253, 251, 248)");
  });
}

// From 320 to 1440 px: nothing sticks out, the statement has its four lines with none cut
// off, the address is on one line, and the header has the name and the language switch in
// one row, without a button.
const widths = [320, 340, 360, 375, 390, 393, 412, 430, 480, 560, 700, 859, 860, 1024, 1280, 1440];

for (const path of ["/", "/en/"]) {
  for (const width of widths) {
    test(`${path} at ${width} px: nothing sticks out, the statement whole, the address on one line`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const outside = await page.evaluate(() =>
        [...document.body.querySelectorAll("*")]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute("class")}`),
      );
      expect(outside).toEqual([]);

      // Four lines, each as high as the font's size (line-height 1), and no line wider than the box.
      const statement = await page.locator(".statement").evaluate((p) => ({
        lines: p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).fontSize),
        whole: p.scrollWidth <= p.clientWidth,
      }));
      expect(statement.lines).toBeCloseTo(4, 1);
      expect(statement.whole).toBe(true);

      // One line: every piece of the address has the same top.
      const tops = await page.locator(".email").evaluate((a) => {
        const range = document.createRange();
        range.selectNodeContents(a);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      });
      expect(tops).toBe(1);

      // The header: 10 + 44 + 10 px and its line, the name and the switch in one row, the name not cut off.
      const header = await page.evaluate(() => {
        const middle = (el: Element) => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        };
        const name = document.querySelector(".site-header .name")!;
        const languages = document.querySelector(".site-header .languages")!;
        return {
          height: document.querySelector(".site-header")!.getBoundingClientRect().height,
          sameRow: Math.abs(middle(name) - middle(languages)) < 1,
          cut: name.scrollWidth > name.clientWidth,
        };
      });
      expect(header).toEqual({ height: 65, sameRow: true, cut: false });
      await expect(page.locator(".site-header .languages")).toBeVisible();
      await expect(page.locator(".site-header .talk")).toHaveCount(0);
    });
  }

  // Before the fonts load the text is wider: a line of the statement is cut off, the page
  // doesn't scroll, and the statement is as high as with the fonts.
  for (const width of [320, 375, 1280]) {
    test(`${path} at ${width} px without the fonts: no horizontal scroll, the statement four lines high`, async ({ page }) => {
      await page.route("**/*.{woff,woff2}", (route) => route.abort());
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === "loaded"))).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const lines = await page.locator(".statement").evaluate((p) => p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).fontSize));
      expect(lines).toBeCloseTo(4, 1);
    });
  }

  // From 860 px the sentence about Coachboard is beside the statement, from the same top; below it, under it.
  for (const width of [393, 1280]) {
    test(`${path} at ${width} px: the sentence ${width < 860 ? "under" : "beside"} the statement`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const statement = (await page.locator(".statement").boundingBox())!;
      const more = (await page.locator(".more").boundingBox())!;
      if (width < 860) {
        expect(more.y).toBeGreaterThanOrEqual(statement.y + statement.height);
        expect(more.x).toBeCloseTo(statement.x, 0);
      } else {
        expect(more.x).toBeGreaterThanOrEqual(statement.x + statement.width);
        expect(more.y).toBeCloseTo(statement.y, 0);
      }
    });
  }
}

// The page fills the window. The stage is 70% of its height with the header, so the foot
// starts at the same place whatever the text above it does; the foot, with the address on
// ink blue, goes on to the window's foot, and nothing scrolls.
for (const [width, height] of [
  [1280, 800],
  [393, 800],
] as const) {
  test(`/ at ${width} × ${height}: the foot starts at 70% of the window and ends at its foot`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const foot = (await page.locator(".close").boundingBox())!;
    expect(foot.y).toBeCloseTo(0.7 * height, 0);
    expect(foot.y + foot.height).toBeCloseTo(height, 0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
  });
}

// WCAG 1.4.12 Text Spacing, as e2e/spacing.spec.ts checks for the full page's step lines:
// with a reader's own spacing (line height 1.5, letters 0.12em, words 0.16em, 2em after a
// paragraph) no line of the statement is cut off, and nothing sticks out of the page.
test.describe("with a reader's own text spacing", () => {
  // A reader's style sheet or bookmarklet is not bound by the page's CSP.
  test.use({ bypassCSP: true });

  const SPACING =
    "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }";

  for (const path of ["/", "/en/"]) {
    for (const width of [320, 393, 560, 860, 1280, 1440]) {
      test(`${path} at ${width} px: the statement's lines are whole, the sentence clear of it`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: SPACING });
        const statement = await page.locator(".statement").evaluate((p) => {
          const box = p.getBoundingClientRect();
          // The widest line's own text, by its glyphs: a line too wide would run out of the box.
          const right = Math.max(
            ...[...p.querySelectorAll(".line")].map((line) => {
              const range = document.createRange();
              range.selectNodeContents(line);
              return range.getBoundingClientRect().right;
            }),
          );
          return { whole: p.scrollWidth <= p.clientWidth, over: Math.round((right - box.right) * 10) / 10 };
        });
        expect(statement.whole).toBe(true);
        expect(statement.over).toBeLessThanOrEqual(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      });
    }
  }
});

// Layout shifts while loading, with the fonts arriving late, as e2e/art.spec.ts checks for
// the full page's hero. Only Chromium: WebKit has no Layout Instability API. The header and
// the statement have fixed sizes, and the foot starts at a fixed place (in a window as high
// as this one), so nothing in them may shift at all. The sentence beside the statement is
// running text: it may wrap differently until its font has loaded, and move its link.
type Shift = { html: string; dx: number; dy: number };
for (const path of ["/", "/en/"]) {
  for (const width of [393, 1280]) {
    test(`${path} at ${width} px: no layout shift in the header, the statement or the foot`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "WebKit has no Layout Instability API");
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        const shifts: Shift[] = [];
        (window as unknown as { shifts: Shift[] }).shifts = shifts;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { sources: { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] }[]) {
            for (const { node, previousRect, currentRect } of entry.sources) {
              const el = node instanceof Element ? node : node?.parentElement;
              if (!el?.closest("header, .statement, .close")) continue;
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
