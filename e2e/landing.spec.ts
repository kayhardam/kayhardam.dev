import type { Page } from "@playwright/test";
import { coachboardBoard, email, mailto } from "../src/data/links";
import { tacticPages, tactics } from "../src/data/opening";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The landing page (Kay, 25 November 2026), in each language: its texts and links, the one
// island, the palette Oranje; the opening that moves with the scroll where the browser has
// scroll-driven animations, and the plain one with less motion; nothing sticking out from 320
// to 1440 px. Runs only while src/pages/index.astro shows Landing.astro (playwright.config.ts).

const pages = [
  { path: "/", t: nl, locale: "nl" as const, steps: ["MO loopt schuin naar links en krijgt de bal van RO. CL loopt naar rechts naar de 6 meter.", "LO kruist achter MO langs.", "MO speelt de bal terug naar LO.", "LO loopt door en schiet op doel."], title: "Kruising MO–LO" },
  { path: "/en/", t: en, locale: "en" as const, steps: ["CB goes diagonally left and gets the ball from RB. P runs right to the 6-metre line.", "LB crosses behind CB.", "CB passes to LB.", "LB runs on and shoots at goal."], title: "Crossing CB–LB" },
];

/** Whether this browser runs the moving opening: scroll-driven animations, and motion allowed. */
const moving = (page: Page) => page.evaluate(() => CSS.supports("animation-timeline", "view()") && matchMedia("(prefers-reduced-motion: no-preference)").matches);

/** Scrolls to `p` of the opening, 0 to 1, as Opening.svelte and the CSS's view timeline count it. */
async function scrollOpening(page: Page, p: number) {
  await page.evaluate((p) => {
    const section = document.querySelector<HTMLElement>("[data-opening]")!;
    const header = parseFloat(getComputedStyle(section).getPropertyValue("--header"));
    const top = section.getBoundingClientRect().top + scrollY;
    scrollTo(0, top - header + p * (section.offsetHeight - (innerHeight - header)));
  }, p);
  await page.waitForTimeout(150);
}

const opacity = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => Number(getComputedStyle(el).opacity));

for (const { path, t, locale, steps, title } of pages) {
  test(`${path}: every text is on the page, the steps in order, the name the only heading`, async ({ page }) => {
    await page.goto(path);
    const sentences = t.holding.statement.map((lines) => lines.join(" "));
    for (const value of [t.name, ...sentences, t.holding.product, t.hero.button, t.opening.button, email]) {
      await expect(page.getByText(value, { exact: true }).first()).toBeAttached();
    }
    await expect(page.getByRole("list", { name: title }).getByRole("listitem")).toHaveCount(4);
    await expect(page.locator(".steps .text")).toHaveText(steps);
    await expect(page.locator(".steps .counter")).toHaveText(steps.map((_, i) => `${t.board.counter.replace("{n}", String(i + 1)).replace("{count}", "4")} · ${title}`));
    await expect(page.getByRole("img", { name: `${t.board.court}: ${title}` })).toHaveCount(1);
    await expect(page.locator("h1, h2, h3, h4, h5, h6")).toHaveText([t.name]);
  });

  test(`${path}: every link has its name and address`, async ({ page }) => {
    await page.goto(path);
    const home = locale === "nl" ? "/" : "/en/";
    const links: [string, string][] = [
      [t.name, home],
      ["NL", "/"],
      ["EN", "/en/"],
      ...(tacticPages[locale] ? [[title, tacticPages[locale]!] as [string, string]] : []),
      [t.hero.button, tactics[locale]],
      [t.opening.button, coachboardBoard[locale]],
      [email, mailto],
    ];
    await expect(page.getByRole("link")).toHaveCount(links.length);
    for (const [name, href] of links) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
  });

  // The one island, the opening with the 3D scene, and Astro's two scripts for it.
  test(`${path}: one island, the opening, and nothing else that runs`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("astro-island")).toHaveCount(1);
    await expect(page.locator("astro-island")).toHaveAttribute("component-url", /Opening/);
    await expect(page.locator("astro-island")).toHaveAttribute("client", "visible");
    await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(2);
  });

  // The palette Oranje (Kay, 25 November 2026): krijt, marine, oranje.
  test(`${path}: the page is in Oranje`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-palette", "oranje");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f8fafc");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(248, 250, 252)");
    const colours = await page.locator(".statement .sentence").evaluateAll((all) => all.map((s) => getComputedStyle(s).color));
    expect(colours).toEqual(["rgb(15, 23, 42)", "rgb(194, 65, 12)"]);
    await expect(page.locator(".draw")).toHaveCSS("background-color", "rgb(234, 88, 12)");
    await expect(page.locator(".close")).toHaveCSS("background-color", "rgb(15, 23, 42)");
  });

  // Along the scroll: the statement first, then each step on its own, then the board. The scene
  // draws the same moments where it runs; it never throws, with WebGL or without.
  test(`${path}: the opening moves with the scroll`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(path);
    test.skip(!(await moving(page)), "no scroll-driven animations in this browser");
    await page.evaluate(() => document.fonts.ready);
    const section = (await page.locator("[data-opening]").boundingBox())!;
    expect(section.height).toBeGreaterThan(4 * page.viewportSize()!.height);
    await scrollOpening(page, 0);
    expect(await opacity(page, ".statement")).toBeCloseTo(1, 1);
    expect(await opacity(page, ".board")).toBeCloseTo(0, 1);
    for (const [p, shown] of [[0.2, 1], [0.38, 2], [0.49, 3], [0.65, 4]] as const) {
      await scrollOpening(page, p);
      const seen = await page.locator(".steps .step").evaluateAll((all) => all.map((el) => Number(getComputedStyle(el).opacity)));
      expect(seen.map((o) => (o > 0.9 ? 1 : 0)), `at ${p}`).toEqual([1, 2, 3, 4].map((n) => (n === shown ? 1 : 0)));
    }
    await scrollOpening(page, 1);
    expect(await opacity(page, ".board")).toBeCloseTo(1, 1);
    expect(await opacity(page, ".statement")).toBeCloseTo(0, 1);
    expect(errors).toEqual([]);
  });

  // With less motion: the plain opening, no tall section, the board shown, no scene.
  test(`${path}: with less motion, the plain opening without the scene`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const section = (await page.locator("[data-opening]").boundingBox())!;
    expect(section.height).toBeLessThan(3 * page.viewportSize()!.height);
    expect(await opacity(page, ".board")).toBe(1);
    expect(await opacity(page, ".statement")).toBe(1);
    await expect(page.locator(".scene")).toBeHidden();
    await page.waitForTimeout(500);
    await expect(page.locator("[data-opening]")).not.toHaveAttribute("data-opening", "3d");
  });
}

// From 320 to 1440 px, moving and plain: nothing sticks out, and the statement has its four lines, none cut off.
const widths = [320, 360, 390, 430, 560, 859, 860, 1024, 1280, 1440];
for (const path of ["/", "/en/"]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    for (const width of widths) {
      test(`${path} at ${width} px${reducedMotion === "reduce" ? " with less motion" : ""}: nothing sticks out, the statement whole`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion });
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        for (const p of [0, 0.5, 1]) {
          if (reducedMotion === "no-preference") await scrollOpening(page, p);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        }
        const statement = await page.locator(".statement").evaluate((p) => ({
          lines: p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).fontSize),
          whole: p.scrollWidth <= p.clientWidth,
        }));
        expect(statement.lines).toBeCloseTo(4, 1);
        expect(statement.whole).toBe(true);
      });
    }
  }
}
