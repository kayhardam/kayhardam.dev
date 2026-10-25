import { expect, missingPages, test } from "./helpers";

// One 404 page for every missing URL: Dutch first, then English.

for (const path of missingPages) {
  test(`${path} gets the 404 page with status 404`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Pagina niet gevonden | Kay Hardam");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    await expect(page.locator("h1")).toHaveText(["Pagina niet gevonden", "Page not found"]);

    const nl = page.locator('section[lang="nl"]');
    await expect(nl.getByText("De pagina die je zocht bestaat niet.")).toBeVisible();
    await expect(nl.getByRole("link", { name: "Naar de startpagina" })).toHaveAttribute("href", "/");

    const en = page.locator('section[lang="en"]');
    await expect(en.getByText("The page you were looking for doesn’t exist.")).toBeVisible();
    await expect(en.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/en/");
  });
}

// The link like the GitHub link at Contact: white, the weight of the text, underlined (phase 8).
test("the links: white, not bold, underlined", async ({ page }) => {
  await page.goto(missingPages[0]!);
  const styles = await page.locator("main a").evaluateAll((all) =>
    all.map((a) => {
      const s = getComputedStyle(a);
      return { color: s.color, weight: s.fontWeight, line: s.textDecorationLine };
    }),
  );
  expect(styles).toEqual(Array(2).fill({ color: "rgb(248, 250, 252)", weight: "400", line: "underline" }));
});
