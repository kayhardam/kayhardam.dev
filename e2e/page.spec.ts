import { boards } from "../src/data/boards";
import { coachboard, email, evidence, mailto } from "../src/data/links";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { expect, test } from "./helpers";

// The page in each language (Hars, 15 November 2026): every text, the headings and the links.

const pages = [
  { path: "/", t: nl, locale: "nl" as const },
  { path: "/en/", t: en, locale: "en" as const },
];

for (const { path, t, locale } of pages) {
  test(`${path}: every text is on the page`, async ({ page }) => {
    await page.goto(path);
    const texts = [
      t.name,
      t.talk,
      t.hero.button,
      ...t.figures.flatMap((f) => [f.rest, f.was]),
      t.lens.heading,
      t.lens.hint,
      t.work.heading,
      ...t.work.items.flatMap((item) => [item.name, item.status, item.tech]),
      t.close.heading,
      email,
    ];
    for (const value of texts) await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
    await expect(page.locator("h1")).toHaveText(t.name);
  });

  test(`${path}: the headings: the name, the lens, the work with its projects, the close`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1, h2, h3, h4, h5, h6")).toHaveText([
      t.name,
      t.lens.heading,
      t.work.heading,
      ...t.work.items.map((item) => item.name),
      t.close.heading,
    ]);
  });

  // One goal: a conversation. The header's button and the address in the close both open an email.
  test(`${path}: every link has its name and address`, async ({ page }) => {
    await page.goto(path);
    const home = locale === "nl" ? "/" : "/en/";
    const links = [
      [t.name, home],
      ["NL", "/"],
      ["EN", "/en/"],
      [t.talk, mailto],
      [t.hero.button, boards[locale]],
      ...t.figures.map((f, i) => [`${f.value} ${f.rest} ${f.was}`, evidence[i]!]),
      ["Coachboard", coachboard[locale]],
      [email, mailto],
    ];
    await expect(page.getByRole("link")).toHaveCount(links.length);
    for (const [name, href] of links) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href!);
    }
    await expect(page.locator("a[rel]")).toHaveCount(0);
  });

  test(`${path}: the work: each project with its status as a word and its technique`, async ({ page }) => {
    await page.goto(path);
    const items = page.locator(".work li");
    await expect(items).toHaveCount(t.work.items.length);
    for (const [i, item] of t.work.items.entries()) {
      await expect(items.nth(i).locator(".status")).toHaveText(item.status);
      await expect(items.nth(i).locator(".tech")).toHaveText(item.tech);
    }
  });

  // The header: sticky on espresso, the button amber with espresso text.
  test(`${path}: the header stays at the top, with its button`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => scrollTo(0, 2000));
    const header = (await page.locator(".site-header").boundingBox())!;
    expect(header.y).toBe(0);
    const talk = page.getByRole("link", { name: t.talk, exact: true });
    await expect(talk).toBeInViewport();
    await expect(talk).toHaveCSS("background-color", "rgb(255, 179, 0)");
    await expect(talk).toHaveCSS("color", "rgb(22, 17, 13)");
  });
}
