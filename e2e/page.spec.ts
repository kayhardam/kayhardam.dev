import { boards } from "../src/data/boards";
import { coachboard, drills, email, github, mailto, tactics } from "../src/data/links";
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
    // The heading "Coachboard" by its role: the link in About me has the same text (phase 9).
    await expect(page.getByRole("heading", { name: t.coachboard.heading, exact: true })).toBeVisible();
    const texts = [
      t.hero.button,
      t.coachboard.intro,
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
    expect(await page.locator(".about .big").allTextContents()).toEqual(t.about.text);
    await expect(page.locator("h1")).toHaveText(t.name);
    await expect(page.locator(".statement")).toHaveText(t.statement.join(" "));
    await expect(page.locator(".note")).toHaveText(t.coachboard.note.join(""));
    await expect(page.locator(".product")).toHaveText(t.about.product.join(""));
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
      [t.coachboard.note[1], tactics[locale]],
      [t.coachboard.note[3], drills[locale]],
      [t.coachboard.button, coachboard[locale]],
      [t.about.product[1], coachboard[locale]],
      [email, mailto],
      [t.contact.github[1], github],
    ];
    await expect(page.getByRole("link")).toHaveCount(links.length);
    for (const [name, href] of links) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href!);
    }
    // GitHub's profile is Kay's own: rel="me", for search engines and for a link back.
    await expect(page.getByRole("link", { name: t.contact.github[1], exact: true })).toHaveAttribute("rel", "me");
    await expect(page.locator("a[rel]")).toHaveCount(1);
  });

  test(`${path}: the arrow is a hidden SVG`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole("link", { name: t.coachboard.button, exact: true });
    await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
    await expect(link).toHaveText(t.coachboard.button);
  });
}
