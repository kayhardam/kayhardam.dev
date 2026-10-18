import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The images from Coachboard (phase 3): the KH logo, the section numbers, the
// pass, the field lines and the shot. All decoration: hidden, and nothing to click.

const pages = [
  { path: "/", t: nl },
  { path: "/en/", t: en },
];

for (const { path, t } of pages) {
  test(`${path}: every SVG is hidden and has nothing to click`, async ({ page }) => {
    await page.goto(path);
    const svgs = await page.locator("svg").evaluateAll((all) =>
      all.map((svg) => ({
        hidden: svg.closest('[aria-hidden="true"]') !== null,
        focusable: svg.querySelector("a, button, [tabindex]") !== null,
      })),
    );
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) expect(svg).toEqual({ hidden: true, focusable: false });
  });

  test(`${path}: the logo: 34 px, in the link kayhardam.dev, with the label KH`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole("link", { name: t.site, exact: true });
    await expect(link).toHaveAccessibleName(t.site);
    const logo = link.locator("svg");
    await expect(logo).toHaveAttribute("aria-hidden", "true");
    await expect(logo.locator("text")).toHaveText("KH");
    const box = (await logo.boundingBox())!;
    expect(box.width).toBeCloseTo(34, 0);
    expect(box.height).toBeCloseTo(34, 0);
  });
}
