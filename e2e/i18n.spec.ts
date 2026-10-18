import { allPages, expect, site, test } from "./helpers";

// Dutch on /, English on /en/: lang, canonical, hreflang and the language switch.

const pages = [
  { path: "/", lang: "nl", label: "Taal" },
  { path: "/en/", lang: "en", label: "Language" },
];

test("the build has exactly these pages", () => {
  expect(allPages()).toEqual(pages.map((p) => p.path).sort());
});

for (const { path, lang, label } of pages) {
  test(`${path}: lang, canonical and hreflang`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${site}${path}`);
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) => links.map((l) => `${l.getAttribute("hreflang")} ${l.getAttribute("href")}`));
    expect(alternates).toEqual([`nl ${site}/`, `en ${site}/en/`, `x-default ${site}/en/`]);
  });

  test(`${path}: the language switch`, async ({ page }) => {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: label });
    await expect(nav.getByRole("link")).toHaveText(["NL", "EN"]);
    await expect(nav.getByRole("link", { name: lang.toUpperCase() })).toHaveAttribute("aria-current", "page");
    const other = lang === "nl" ? "en" : "nl";
    await nav.getByRole("link", { name: other.toUpperCase() }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", other);
  });

  test(`${path}: the name is the only h1`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveText("Kay Hardam");
  });
}

test("/en redirects to /en/", async ({ page }) => {
  await page.goto("/en");
  expect(new URL(page.url()).pathname).toBe("/en/");
});
