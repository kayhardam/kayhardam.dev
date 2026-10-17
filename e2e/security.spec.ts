import { allPages, expect, missingPages, test, watchViolations } from "./helpers";

// The CSP (a <meta> from Astro plus frame-ancestors in public/_headers) and the
// other security headers, on every page and on the 404 page.

for (const path of [...allPages(), ...missingPages]) {
  test(`${path}: no CSP violations, nothing from another origin`, async ({ page }) => {
    const violations = await watchViolations(page);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await violations()).toEqual([]);
    const origin = new URL(page.url()).origin;
    expect(requests.filter((url) => !url.startsWith(origin))).toEqual([]);
  });
}

test("security headers on every response", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toBe("max-age=31536000");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
});

test("the fonts load from the site itself", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replaceAll('"', "")} ${f.weight}`),
  );
  expect(loaded).toContain("Barlow Condensed 700");
});
