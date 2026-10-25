import sharp from "sharp";
import type { Page } from "@playwright/test";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test, watchViolations } from "./helpers";

// Two photos, from astro:assets as AVIF, WebP and JPEG, both round like a player:
// - in About me (phase 7): a white edge of 5 px, 300, 600 and 799 px. Above the
//   text on the phone and tablet, beside it from 860 px;
// - in the hero (phase 8): 64 px before the name, a white edge of 3 px, 64, 128
//   and 192 px, loaded at once, and without alt text: the name is beside it.

test.use({ reducedMotion: "reduce" });

const pages = [
  { path: "/", t: nl },
  { path: "/en/", t: en },
];

const TYPES: Record<string, string> = { avif: "image/avif", webp: "image/webp", jpg: "image/jpeg" };

/** The candidates of a srcset: each URL with its width descriptor. */
const candidates = (srcset: string) =>
  srcset.split(",").map((candidate) => {
    const [url, w] = candidate.trim().split(/\s+/);
    return { url, w: parseInt(w, 10) };
  });

/** Scrolls to the photo (".hero img" or ".about img") and waits until it is decoded. */
async function loaded(page: Page, selector: string) {
  const photo = page.locator(selector);
  await photo.scrollIntoViewIfNeeded();
  await photo.evaluate((img: HTMLImageElement) => img.decode());
  return photo;
}

/** The width descriptor of the file the browser chose, and the largest in the srcset of its format. */
async function chosen(page: Page, selector: string) {
  const photo = await loaded(page, selector);
  return photo.evaluate((img: HTMLImageElement) => {
    const path = new URL(img.currentSrc).pathname;
    const format = path.split(".").pop();
    const source = img.parentElement!.querySelector(`source[type="image/${format}"]`);
    const srcset = (source ?? img).getAttribute("srcset")!;
    const list = srcset.split(",").map((c) => c.trim().split(/\s+/));
    return {
      w: parseInt(list.find(([url]) => url === path)![1], 10),
      largest: Math.max(...list.map(([, w]) => parseInt(w, 10))),
      naturalWidth: img.naturalWidth,
      width: img.getBoundingClientRect().width,
    };
  });
}

for (const { path, t } of pages) {
  test(`${path}: two images, in the hero without alt text, in About me with it`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("img", { name: t.about.photo, exact: true })).toHaveCount(1);
    expect(
      await page.locator("img").evaluateAll((all) => all.map((img) => [img.getAttribute("alt"), img.closest(".hero, .about")!.classList[0]])),
    ).toEqual([
      ["", "hero"],
      [t.about.photo, "about"],
    ]);
  });

  test(`${path}: both photos load as AVIF or WebP from /_astro/, without CSP violations`, async ({ page }) => {
    const violations = await watchViolations(page);
    await page.goto(path);
    for (const selector of [".hero img", ".about img"]) {
      const photo = await loaded(page, selector);
      const state = await photo.evaluate((img: HTMLImageElement) => ({
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        path: new URL(img.currentSrc).pathname,
      }));
      expect(state.complete, selector).toBe(true);
      expect(state.naturalWidth, selector).toBeGreaterThan(0);
      // WebKit on Linux may lack AVIF, so WebP is fine too.
      expect(state.path, selector).toMatch(/^\/_astro\/kay-hardam\.[\w-]+\.(avif|webp)$/);
    }
    expect(await violations()).toEqual([]);
  });

  // In the hero, on the phone: the board and the button first, then the photo with the name, then the statement.
  test(`${path}: on the phone the button, then the photo and the name, then the statement`, async ({ page }) => {
    await page.goto(path);
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    const [button, photo, name, statement] = await Promise.all([".hero-button", ".hero img", "h1", ".statement"].map(box));
    expect(photo.y).toBeGreaterThan(button.y + button.height);
    expect(statement.y).toBeGreaterThan(photo.y + photo.height);
    expect(Math.abs(name.y + name.height / 2 - (photo.y + photo.height / 2))).toBeLessThanOrEqual(1);
  });
}

test("every file in every srcset is there, with its type and size, and without EXIF or ICC", async ({ page }) => {
  await page.goto("/");
  const files = [];
  for (const [selector, widths] of [
    [".hero picture", [64, 128, 192]],
    [".about picture", [300, 600, 799]],
  ] as const) {
    const sets = await page.locator(selector).evaluate((picture) =>
      [...picture.querySelectorAll("source, img")].map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type"),
        srcset: el.getAttribute("srcset")!,
        src: el.getAttribute("src"),
      })),
    );
    expect(sets.map(({ tag, type }) => [tag, type]), selector).toEqual([
      ["source", "image/avif"],
      ["source", "image/webp"],
      ["img", null],
    ]);
    for (const { srcset } of sets) expect(candidates(srcset).map(({ w }) => w), selector).toEqual(widths);
    expect(candidates(sets[2].srcset).map(({ url }) => url), selector).toContain(sets[2].src);
    files.push(...sets.flatMap(({ srcset }) => candidates(srcset)));
  }
  expect(files).toHaveLength(18);
  for (const { url, w } of files) {
    const response = await page.request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()["content-type"], url).toBe(TYPES[url.split(".").pop()!]);
    const { width, height, exif, icc } = await sharp(await response.body()).metadata();
    expect({ width, height, exif, icc }, url).toEqual({ width: w, height: w, exif: undefined, icc: undefined });
  }
});

test("About me, the attributes: width and height 300, lazy, async, and sizes", async ({ page }) => {
  await page.goto("/");
  const img = page.locator(".about img");
  for (const [name, value] of [
    ["width", "300"],
    ["height", "300"],
    ["loading", "lazy"],
    ["decoding", "async"],
    ["sizes", "min(300px, 70vw)"],
  ]) {
    await expect(img).toHaveAttribute(name, value);
  }
  for (const source of await page.locator(".about source").all()) {
    await expect(source).toHaveAttribute("sizes", "min(300px, 70vw)");
  }
});

// Which file the browser chooses (plan, chapter 2: the same in Chromium and WebKit).
// naturalWidth is the srcset width divided by the density, so it shows that
// sizes is worked out: with 100vw or a fixed 300 it would not be the width on screen.
// The phones (DPR 3 and 2.625) choose the largest file of both photos.
test("the phone itself chooses the largest file, and sizes is worked out", async ({ page }) => {
  await page.goto("/");
  for (const selector of [".hero img", ".about img"]) {
    const { w, largest, naturalWidth, width } = await chosen(page, selector);
    expect(w, selector).toBe(largest);
    expect(Math.abs(naturalWidth - width), selector).toBeLessThanOrEqual(1);
  }
});

for (const [dpr, about, hero] of [
  [2, 600, 128],
  [1, 300, 64],
] as const) {
  test.describe(`1280 px at DPR ${dpr}`, () => {
    test.use({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: dpr });

    test(`chooses the file of ${about}w in About me and of ${hero}w in the hero`, async ({ page }) => {
      await page.goto("/");
      for (const [selector, expected, size] of [
        [".about img", about, 300],
        [".hero img", hero, 64],
      ] as const) {
        const { w, naturalWidth, width } = await chosen(page, selector);
        expect(w, selector).toBe(expected);
        expect(width, selector).toBe(size);
        expect(Math.abs(naturalWidth - width), selector).toBeLessThanOrEqual(1);
      }
    });
  });
}

test("About me: round, with a white edge of 5 px", async ({ page }) => {
  await page.goto("/");
  const photo = await loaded(page, ".about img");
  // The field lines run behind the photo on the phone; hidden here, so the corners are the section's second navy.
  // Through the CSSOM: the CSP allows no new stylesheet.
  await page.locator(".about .field-lines").evaluate((lines: HTMLElement) => (lines.style.visibility = "hidden"));
  const style = await photo.evaluate((img) => {
    const s = getComputedStyle(img);
    const box = img.getBoundingClientRect();
    return {
      radius: s.borderTopLeftRadius,
      widths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      colours: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor],
      square: box.width === box.height,
    };
  });
  expect(style).toEqual({
    radius: "50%",
    widths: ["5px", "5px", "5px", "5px"],
    colours: Array(4).fill("rgb(255, 255, 255)"),
    square: true,
  });

  const { data, info } = await sharp(await photo.screenshot({ scale: "css" })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgb = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
  const near = (actual: number[], [r, g, b]: number[]) => Math.max(...actual.map((v, i) => Math.abs(v - [r, g, b][i]))) <= 8;
  const last = info.width - 1;
  for (const [x, y] of [[0, 0], [last, 0], [0, last], [last, last]]) {
    expect(near(rgb(x, y), [0x1e, 0x29, 0x3b]), `corner ${x},${y}: ${rgb(x, y)}`).toBe(true);
  }
  const middle = Math.round(info.width / 2);
  expect(near(rgb(middle, 2), [255, 255, 255]), `top edge: ${rgb(middle, 2)}`).toBe(true);
});

for (const width of [320, 393, 430, 768, 859, 860, 1024, 1280]) {
  test(`${width} px: the size, and the photo ${width < 860 ? "above" : "beside"} the text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const photo = await loaded(page, ".about img");
    const boxes = await photo.evaluate((img) => {
      const about = img.closest(".about")!;
      const box = (el: Element) => el.getBoundingClientRect().toJSON() as DOMRect;
      return { photo: box(img), text: box(about.querySelector(".about-text")!), number: box(about.querySelector(".section-number")!) };
    });
    const size = width < 860 ? Math.min(300, 0.7 * width) : 300;
    expect(Math.abs(boxes.photo.width - size)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(boxes.photo.height - size)).toBeLessThanOrEqual(0.5);

    if (width < 860) {
      expect(Math.abs(boxes.number.top - boxes.photo.bottom - 40)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes.photo.left - boxes.text.left)).toBeLessThanOrEqual(1);
    } else {
      expect(Math.abs(boxes.text.left - boxes.photo.right - 64)).toBeLessThanOrEqual(1);
      const centre = (b: DOMRect) => b.top + b.height / 2;
      expect(Math.abs(centre(boxes.photo) - centre(boxes.text))).toBeLessThanOrEqual(1);
    }

    // The field lines lie behind the photo.
    const hit = await photo.evaluate((img) => {
      const b = img.getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === img;
    });
    expect(hit).toBe(true);
  });
}

test.describe("no layout shift from the photo", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  /** The photo's box and number 2's place, relative to the section. */
  const measure = (page: Page) =>
    page.locator(".about").evaluate((about) => {
      const top = about.getBoundingClientRect().top;
      const img = about.querySelector("img")!.getBoundingClientRect();
      const number = about.querySelector(".section-number")!.getBoundingClientRect();
      return { photo: [img.left, img.top - top, img.width, img.height], number: [number.left, number.top - top] };
    });

  test("when the photo comes late", async ({ page, browserName }) => {
    // The photo waits until the test has measured, and at least 1.5 s.
    let release = () => {};
    const measured = new Promise<void>((resolve) => (release = resolve));
    let arrived = false;
    await page.route("**/_astro/kay-hardam.*", async (route) => {
      await Promise.all([measured, new Promise((resolve) => setTimeout(resolve, 1500))]);
      await route.continue();
      arrived = true;
    });
    if (browserName === "chromium") {
      await page.addInitScript(() => {
        const sources: string[] = [];
        (window as unknown as { shifts: string[] }).shifts = sources;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { sources: { node?: Node }[] }[]) {
            for (const { node } of entry.sources) {
              const el = node instanceof Element ? node : node?.parentElement;
              if (el?.closest(".about")) sources.push(el.outerHTML.slice(0, 80));
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
    }
    // Not the load event, nor document.fonts.ready: in WebKit both wait for the photo,
    // which WebKit may fetch before the scroll. The two fonts themselves, then.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => Promise.all(["600", "700"].map((weight) => document.fonts.load(`${weight} 48px "Barlow Condensed"`))));
    await page.locator(".about img").scrollIntoViewIfNeeded();
    const before = await measure(page);
    expect(arrived).toBe(false);
    release();
    await page.locator(".about img").evaluate((img: HTMLImageElement) => img.decode());
    expect(arrived).toBe(true);
    expect(await measure(page)).toEqual(before);
    expect(before.photo.slice(2)).toEqual([300, 300]);
    if (browserName === "chromium") {
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => (window as unknown as { shifts: string[] }).shifts)).toEqual([]);
    }
  });

  // Without aspect-ratio: 1, WebKit collapses the box of a failed image to 34 px high.
  test("when the photo does not load, the box stays square", async ({ page }) => {
    await page.route("**/_astro/kay-hardam.*", (route) => route.abort());
    await page.goto("/");
    await page.locator(".about img").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const { photo } = await measure(page);
    expect(photo.slice(2)).toEqual([300, 300]);
  });
});

test("the hero, the attributes: width and height 64, eager, async, and sizes", async ({ page }) => {
  await page.goto("/");
  const img = page.locator(".hero img");
  for (const [name, value] of [
    ["width", "64"],
    ["height", "64"],
    ["loading", "eager"],
    ["decoding", "async"],
    ["sizes", "64px"],
  ]) {
    await expect(img).toHaveAttribute(name, value);
  }
  for (const source of await page.locator(".hero source").all()) {
    await expect(source).toHaveAttribute("sizes", "64px");
  }
});

test("the hero: loaded without scrolling", async ({ page }) => {
  await page.goto("/");
  const state = await page.locator(".hero img").evaluate((img: HTMLImageElement) => ({ complete: img.complete, naturalWidth: img.naturalWidth }));
  expect(state.complete).toBe(true);
  expect(state.naturalWidth).toBeGreaterThan(0);
});

test("the hero: round, with a white edge of 3 px, 16 px before the name, in its middle", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const photo = await loaded(page, ".hero img");
  const style = await photo.evaluate((img) => {
    const s = getComputedStyle(img);
    const box = img.getBoundingClientRect();
    const name = img.closest(".name")!.querySelector("h1")!.getBoundingClientRect();
    return {
      radius: s.borderTopLeftRadius,
      widths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      colours: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor],
      size: [box.width, box.height],
      gap: name.left - box.right,
      centres: Math.abs(name.top + name.height / 2 - (box.top + box.height / 2)) <= 1,
    };
  });
  expect(style).toEqual({
    radius: "50%",
    widths: ["3px", "3px", "3px", "3px"],
    colours: Array(4).fill("rgb(255, 255, 255)"),
    size: [64, 64],
    gap: 16,
    centres: true,
  });

  const { data, info } = await sharp(await photo.screenshot({ scale: "css" })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgb = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
  const near = (actual: number[], [r, g, b]: number[]) => Math.max(...actual.map((v, i) => Math.abs(v - [r, g, b][i]))) <= 8;
  const last = info.width - 1;
  for (const [x, y] of [[0, 0], [last, 0], [0, last], [last, last]]) {
    expect(near(rgb(x, y), [0x0f, 0x17, 0x2a]), `corner ${x},${y}: ${rgb(x, y)}`).toBe(true);
  }
  const middle = Math.round(info.width / 2);
  // The edge is 3 px: WebKit on Linux (CI) smooths its middle to 246.
  expect(Math.min(...rgb(middle, 1)), `top edge: ${rgb(middle, 1)}`).toBeGreaterThanOrEqual(240);
});

for (const width of [393, 1280]) {
  test.describe(`${width} px: no layout shift from the photo in the hero`, () => {
    test.use({ viewport: { width, height: 900 } });

    /** The photo's box, the name's and the statement's, relative to the page. */
    const measure = (page: Page) =>
      page.locator(".hero").evaluate((hero) => {
        const box = (selector: string) => {
          const b = hero.querySelector(selector)!.getBoundingClientRect();
          return [b.left, b.top + window.scrollY, b.width, b.height];
        };
        return { photo: box("img"), name: box("h1"), statement: box(".statement") };
      });

    test("when the photo comes late", async ({ page }) => {
      // The photo waits until the test has measured, and at least 1.5 s.
      let release = () => {};
      const measured = new Promise<void>((resolve) => (release = resolve));
      await page.route("**/_astro/kay-hardam.*", async (route) => {
        await Promise.all([measured, new Promise((resolve) => setTimeout(resolve, 1500))]);
        await route.continue();
      });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => Promise.all(["600", "700"].map((weight) => document.fonts.load(`${weight} 48px "Barlow Condensed"`))));
      const before = await measure(page);
      expect(await page.locator(".hero img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(false);
      release();
      await page.locator(".hero img").evaluate((img: HTMLImageElement) => img.decode());
      expect(await measure(page)).toEqual(before);
      expect(before.photo.slice(2)).toEqual([64, 64]);
    });

    test("when the photo does not load, the box stays square", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const loadedBox = await measure(page);
      await page.route("**/_astro/kay-hardam.*", (route) => route.abort());
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      expect(await measure(page)).toEqual(loadedBox);
    });
  });
}
