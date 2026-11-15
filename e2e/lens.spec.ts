import type { Page } from "@playwright/test";
import { evidence } from "../src/data/links";
import taps from "../src/data/tap-targets.json" with { type: "json" };
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The figures and the lens under the hero (Hars, 15 November 2026).

const pages = [
  { path: "/", t: nl, locale: "nl" as const },
  { path: "/en/", t: en, locale: "en" as const },
];

const number = (locale: "nl" | "en", v: number) => new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", { maximumFractionDigits: 1 }).format(v);

/** The figures' values as shown. */
const shown = (page: Page) => page.locator(".figure-value").allTextContents();

for (const { path, t, locale } of pages) {
  test.describe(path, () => {
    test("the figures: three links to their evidence, named by their whole sentence, the value hidden while it counts", async ({ page }) => {
      await page.goto(path);
      const links = page.locator(".figures a");
      await expect(links).toHaveCount(3);
      for (const [i, figure] of t.figures.entries()) {
        const link = links.nth(i);
        await expect(link).toHaveAttribute("href", evidence[i]!);
        await expect(link).toHaveAccessibleName(`${figure.value} ${figure.rest} ${figure.was}`);
        await expect(link.locator(".figure-value")).toHaveAttribute("aria-hidden", "true");
      }
      expect(evidence[0]).toMatch(/kayhardam\/coachboard\/blob\/03be23bea71d6bffa37d5af567b88376d3d592cc\/docs\/metingen\.md\?plain=1#L352-L373$/);
    });

    test.describe("with reduced motion", () => {
      test.use({ reducedMotion: "reduce" });
      test("the figures stand on their final values, also when they come into view", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(path);
        await page.locator(".figures").scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        expect(await shown(page)).toEqual(t.figures.map((f) => f.value));
      });
    });

    test.describe("with motion", () => {
      test.use({ reducedMotion: "no-preference" });

      test("below the first screen, the figures count up from 0 when they come into view", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.clock.install({ time: new Date("2026-11-15T12:00:00") });
        await page.goto(path);
        // 100 px below the screen's foot: hydrated (200 px early), not yet seen, so at 0.
        // (Further down they would still have their final values, as without JavaScript.)
        const top = await page.locator(".figures").evaluate((el) => el.getBoundingClientRect().top + scrollY);
        await page.evaluate((y) => scrollTo(0, y), top - 844 - 100);
        await expect.poll(() => shown(page)).toEqual(["0/12", "0", "0 px"]);
        await page.locator(".figures").scrollIntoViewIfNeeded();
        await page.waitForTimeout(300); // real time, for the IntersectionObserver
        await page.clock.runFor(400);
        const between = await shown(page);
        expect(between).not.toEqual(["0/12", "0", "0 px"]);
        await page.clock.runFor(1000);
        expect(await shown(page)).toEqual(t.figures.map((f) => f.value));
      });

      test("already in view when it loads, the figures don't count", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1600 });
        await page.goto(path);
        await expect(page.locator(".figures")).toBeInViewport();
        for (let i = 0; i < 5; i++) {
          expect(await shown(page)).toEqual(t.figures.map((f) => f.value));
          await page.waitForTimeout(200);
        }
      });
    });

    test("the lens: on the smallest target, every measured target drawn, the screenshot with its ratio", async ({ page }) => {
      await page.goto(path);
      const targets = taps[locale].targets;
      const smallest = targets.filter((target) => "size" in target).reduce((a, b) => ((b as { size: number }).size < (a as { size: number }).size ? b : a)) as (typeof targets)[number] & { size: number };
      await expect(page.locator(".lens-name")).toHaveText(t.lens.target.replace("{name}", smallest.name));
      await expect(page.locator(".lens-size")).toHaveText(`${number(locale, smallest.size)} px`);
      await expect(page.locator(".lens-hint")).toHaveText(t.lens.hint);
      await expect(page.locator(".lens-layer .target")).toHaveCount(targets.length);
      const img = page.locator(".lens-frame img");
      await expect(img).toHaveAttribute("alt", t.lens.image);
      const box = (await img.boundingBox())!;
      expect(box.height / box.width).toBeCloseTo(659 / 393, 2);
    });

    test("the lens follows the pointer: on Share it names the button and its box", async ({ page }) => {
      await page.goto(path);
      const frame = page.locator(".lens-frame");
      await frame.scrollIntoViewIfNeeded();
      // Hydrated once in view: the lens moves.
      await expect(page.locator("astro-island:has(.lens-frame)")).not.toHaveAttribute("ssr");
      const share = taps[locale].targets.find((target) => target.name === (locale === "nl" ? "Delen" : "Share"))!;
      const img = (await page.locator(".lens-frame img").boundingBox())!;
      const scale = img.width / 393;
      await page.mouse.move(img.x + (share.x + share.width / 2) * scale, img.y + (share.y + share.height / 2) * scale);
      await expect(page.locator(".lens-name")).toHaveText(t.lens.target.replace("{name}", share.name));
      await expect(page.locator(".lens-size")).toHaveText(`${number(locale, share.width)} × ${number(locale, share.height)} px`);
      await expect(page.locator(".lens-name")).toHaveAttribute("aria-live", "polite");
    });

    test("the lens with the arrow keys: the frame takes the focus, and the lens moves", async ({ page }) => {
      await page.goto(path);
      const frame = page.locator(".lens-frame");
      // The focus scrolls it into view, and so it hydrates.
      await frame.focus();
      await expect(frame).toBeFocused();
      await expect(page.locator("astro-island:has(.lens-frame)")).not.toHaveAttribute("ssr");
      await expect(frame).toHaveAccessibleName(t.lens.label);
      await expect(frame).toHaveAccessibleDescription(t.lens.keys);
      const lens = page.locator(".lens-ring");
      const at = async () => [Number(await lens.getAttribute("cx")), Number(await lens.getAttribute("cy"))];
      const [x, y] = await at();
      await page.keyboard.press("ArrowRight");
      expect(await at()).toEqual([x! + 8, y]);
      await page.keyboard.press("Shift+ArrowUp");
      expect(await at()).toEqual([x! + 8, y! - 40]);
      // Up to the header row: a button there.
      for (let i = 0; i < 20; i++) await page.keyboard.press("Shift+ArrowUp");
      expect((await at())[1]).toBe(0);
      const scroll = await page.evaluate(() => scrollY);
      await page.keyboard.press("ArrowDown");
      expect(await page.evaluate(() => scrollY)).toBe(scroll);
    });

    test.describe("without JavaScript", () => {
      test.use({ javaScriptEnabled: false });
      test("the lens stands on the smallest target, the figures are final", async ({ page }) => {
        await page.goto(path);
        await expect(page.locator(".lens-name")).not.toBeEmpty();
        expect(await shown(page)).toEqual(t.figures.map((f) => f.value));
      });
    });
  });
}

// The screenshot through astro:assets: AVIF and WebP at 393 and 786 px, each file there,
// with its type and size, and without EXIF or ICC.
test("the lens's screenshot: every file in its srcsets, with its type and size, without metadata", async ({ page }) => {
  const sharp = (await import("sharp")).default;
  await page.goto("/");
  const sets = await page.locator(".lens-frame picture").evaluate((picture) =>
    [...picture.querySelectorAll("source, img")].map((el) => [el.tagName.toLowerCase(), el.getAttribute("type"), el.getAttribute("srcset")!] as const),
  );
  expect(sets.map(([tag, type]) => [tag, type])).toEqual([
    ["source", "image/avif"],
    ["source", "image/webp"],
    ["img", null],
  ]);
  const types: Record<string, string> = { avif: "image/avif", webp: "image/webp" };
  for (const [, , srcset] of sets) {
    const files = srcset.split(",").map((c) => c.trim().split(/\s+/) as [string, string]);
    expect(files.map(([, d]) => d)).toEqual(["1x", "2x"]);
    for (const [url, density] of files) {
      const response = await page.request.get(url);
      expect(response.status(), url).toBe(200);
      expect(response.headers()["content-type"], url).toBe(types[url.split(".").pop()!]);
      const { width, height, exif, icc } = await sharp(await response.body()).metadata();
      const k = density === "2x" ? 2 : 1;
      expect({ width, height, exif, icc }, url).toEqual({ width: 393 * k, height: 659 * k, exif: undefined, icc: undefined });
    }
  }
});
