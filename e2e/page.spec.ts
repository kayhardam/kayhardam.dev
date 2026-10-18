import { boards } from "../src/data/boards";
import { coachboard, email, github, mailto } from "../src/data/links";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The page in each language: every text, the headings and the links.

const pages = [
  { path: "/", t: nl, locale: "nl" as const },
  { path: "/en/", t: en, locale: "en" as const },
];

for (const { path, t, locale } of pages) {
  test(`${path}: every text is on the page`, async ({ page }) => {
    await page.goto(path);
    const texts = [
      t.hero.button,
      t.coachboard.heading,
      ...t.coachboard.text,
      t.coachboard.button,
      t.about.heading,
      ...t.about.text,
      t.about.example,
      t.contact.heading,
      t.contact.question,
      t.contact.mail,
      email,
    ];
    for (const value of texts) await expect(page.getByText(value, { exact: true })).toBeVisible();
    await expect(page.locator("h1")).toHaveText(t.name);
    await expect(page.locator(".statement")).toHaveText(t.statement.join(" "));
    await expect(page.locator(".github")).toHaveText(t.contact.github.join(""));
  });

  test(`${path}: the headings: the name, then the three sections`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1, h2, h3, h4, h5, h6")).toHaveText([
      t.name,
      t.coachboard.heading,
      t.about.heading,
      t.contact.heading,
    ]);
    expect(await page.locator("h2").count()).toBe(3);
  });

  test(`${path}: every link has its name and address`, async ({ page }) => {
    await page.goto(path);
    const home = locale === "nl" ? "/" : "/en/";
    const links = [
      [t.site, home],
      ["NL", "/"],
      ["EN", "/en/"],
      [t.hero.button, boards[locale]],
      [t.coachboard.button, coachboard[locale]],
      [email, mailto],
      [t.contact.github[1], github],
    ];
    await expect(page.getByRole("link")).toHaveCount(links.length);
    for (const [name, href] of links) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href!);
    }
  });

  test(`${path}: the arrow is a hidden SVG`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole("link", { name: t.coachboard.button, exact: true });
    await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
    await expect(link).toHaveText(t.coachboard.button);
  });

  test(`${path}: the photo placeholder is decoration`, async ({ page }) => {
    await page.goto(path);
    const photo = page.locator(".photo");
    await expect(photo).toHaveAttribute("aria-hidden", "true");
    await expect(photo).toHaveText("");
    await expect(page.locator(".board")).toHaveAttribute("aria-hidden", "true");
  });
}
