import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, missingPages, site, test } from "./helpers";

// What search engines and link previews read: the title, the description and
// Open Graph per language. The 404 page has none of it.

const pages = [
  { path: "/", t: nl, lang: "nl", ogLocale: "nl_NL" },
  { path: "/en/", t: en, lang: "en", ogLocale: "en_US" },
];

for (const { path, t, lang, ogLocale } of pages) {
  test(`${path}: the title, the description and Open Graph`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(t.title);
    const meta = (key: string) => page.locator(`meta[name="${key}"], meta[property="${key}"]`);
    await expect(meta("description")).toHaveAttribute("content", t.description);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBe(`${site}${path}`);
    const expected = {
      "og:type": "website",
      "og:site_name": "kayhardam.dev",
      "og:locale": ogLocale,
      "og:url": canonical!,
      "og:title": t.title,
      "og:description": t.description,
      "og:image": `${site}/og-${lang}.png`,
      "og:image:width": "1200",
      "og:image:height": "630",
      "twitter:card": "summary_large_image",
    };
    for (const [key, value] of Object.entries(expected)) {
      await expect(meta(key), key).toHaveCount(1);
      await expect(meta(key), key).toHaveAttribute("content", value);
    }
  });

  // The path, not the absolute URL: on a preview and locally the domain isn't this site.
  test(`${path}: og:image is a PNG of 1200 × 630`, async ({ page, request }) => {
    await page.goto(path);
    const image = new URL((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
    const response = await request.get(image.pathname);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
}

for (const path of missingPages) {
  test(`${path}: the 404 page is noindex, without a description or Open Graph`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    for (const selector of [
      'link[rel="canonical"]',
      'link[rel="alternate"]',
      'meta[name="description"]',
      'meta[property^="og:"]',
      'meta[name^="twitter:"]',
    ]) {
      await expect(page.locator(selector), selector).toHaveCount(0);
    }
  });
}
