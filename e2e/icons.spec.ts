import { expect, missingPages, test } from "./helpers";

// The favicon and the apple-touch-icon, and a clean console: the 404 on
// /favicon.ico cost Best Practices 4 points in phases 1 and 2.

const icons = [
  { href: "/favicon.svg", type: /^image\/svg\+xml/ },
  { href: "/favicon.ico", type: /^image\/(x-icon|vnd\.microsoft\.icon)/ },
  { href: "/apple-touch-icon.png", type: /^image\/png/ },
];

for (const path of ["/", "/en/", missingPages[0]!]) {
  test(`${path}: the three icon links`, async ({ page }) => {
    await page.goto(path);
    const links = await page
      .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
      .evaluateAll((all) => all.map((l) => `${l.getAttribute("rel")} ${l.getAttribute("href")}`));
    expect(links).toEqual(["icon /favicon.svg", "icon /favicon.ico", "apple-touch-icon /apple-touch-icon.png"]);
  });

  test(`${path}: no console errors and no failed requests`, async ({ page }) => {
    const errors: string[] = [];
    const url = new URL(path, test.info().project.use.baseURL).href;
    // On the 404 page the browser reports the document's own status 404; nothing else.
    const ownStatus = (m: import("@playwright/test").ConsoleMessage) => path === missingPages[0] && m.location().url === url;
    page.on("console", (m) => m.type() === "error" && !ownStatus(m) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("requestfailed", (r) => errors.push(`failed: ${r.url()}`));
    // Every response is fine, except the 404 page's own status.
    page.on("response", (r) => r.status() >= 400 && r.request().resourceType() !== "document" && errors.push(`${r.status()}: ${r.url()}`));
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // A headless browser doesn't ask for the icons itself, unlike Lighthouse's Chrome:
    // ask for every icon link and for /favicon.ico from the page, as a browser would.
    const icons = await page.evaluate(async () => {
      const hrefs = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => l.href);
      const responses = await Promise.all([...hrefs, "/favicon.ico"].map((href) => fetch(href)));
      return responses.map((r) => `${r.status} ${new URL(r.url).pathname}`);
    });
    expect(icons).toEqual(["200 /favicon.svg", "200 /favicon.ico", "200 /apple-touch-icon.png", "200 /favicon.ico"]);
    expect(errors).toEqual([]);
  });
}

for (const { href, type } of icons) {
  test(`${href}: status 200 with its content type`, async ({ request }) => {
    const response = await request.get(href);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(type);
  });
}
