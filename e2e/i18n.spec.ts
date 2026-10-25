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

  test(`${path}: the language links: 44 by 44 px, the current one white`, async ({ page }) => {
    await page.goto(path);
    const links = await page
      .getByRole("navigation", { name: label })
      .getByRole("link")
      .evaluateAll((all) =>
        all.map((a) => {
          const { width, height } = a.getBoundingClientRect();
          return { code: a.textContent, width, height, current: a.getAttribute("aria-current"), background: getComputedStyle(a).backgroundColor, color: getComputedStyle(a).color };
        }),
      );
    for (const { code, width, height, current, background, color } of links) {
      expect(width, code!).toBeGreaterThanOrEqual(44);
      expect(height, code!).toBeGreaterThanOrEqual(44);
      if (code === lang.toUpperCase()) expect({ current, background, color }).toEqual({ current: "page", background: "rgb(248, 250, 252)", color: "rgb(15, 23, 42)" });
      else expect({ current, background }).toEqual({ current: null, background: "rgba(0, 0, 0, 0)" });
    }
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
