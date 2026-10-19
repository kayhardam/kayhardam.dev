import type { Page } from "@playwright/test";
import { boardFrom, boards } from "../src/data/boards";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { arrowPath } from "../src/lib/board/geometry";
import { expect, test } from "./helpers";

// The board card (phase 4): step 1 of the share link, rendered at build time,
// with the label, the counter, the sentence, the court, the legend and the three
// buttons. With reduced motion, so the island (phase 5) plays nothing and step 1
// stays; e2e/play.spec.ts tests the playing.

test.use({ reducedMotion: "reduce" });

const pages = [
  { path: "/", t: nl, locale: "nl" as const },
  { path: "/en/", t: en, locale: "en" as const },
];

/** The colour of each team in Court.svelte. */
const teamColor = { a: "#15803d", d: "#0f172a", p: "#2563eb" };

/** The sides of an element's box, rounded to a tenth of a pixel. */
const box = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });

for (const { path, t, locale } of pages) {
  test(`${path}: step 1 with the label, the counter and the sentence`, async ({ page }) => {
    await page.goto(path);
    const board = await boardFrom(boards[locale]);
    await expect(page.locator(".board-label")).toHaveText(t.board.label);
    await expect(page.locator(".board-count [aria-hidden=true]")).toHaveText("1/4");
    await expect(page.locator(".board-count [aria-hidden=true]")).toBeVisible();
    await expect(page.locator(".board-count .visually-hidden")).toHaveText(
      t.board.step.replace("{n}", "1").replace("{count}", "4"),
    );
    await expect(page.locator(".board-count")).not.toHaveAttribute("title");
    const step = page.locator(".board-step");
    await expect(step).toHaveText(board.frames[0]!.text!);
    await expect(step).toHaveAttribute("aria-live", "polite");
    await expect(page.locator(".board")).not.toHaveAttribute("aria-hidden");
  });

  test(`${path}: the hero button's link gives the board the card shows`, async ({ page }) => {
    await page.goto(path);
    const href = await page.locator(".hero-button").getAttribute("href");
    const frame = (await boardFrom(href!)).frames[0]!;
    const court = page.locator(".board-court svg");

    const players = await court.locator('[data-kind="player"]').evaluateAll((all) =>
      all.map((g) => ({
        at: g.getAttribute("transform"),
        label: g.querySelector("text")?.textContent ?? undefined,
        fill: g.querySelector('circle[stroke="#ffffff"]')!.getAttribute("fill"),
      })),
    );
    expect(players).toEqual(
      frame.players.map((p) => ({ at: `translate(${p.at[0]} ${p.at[1]})`, label: p.label, fill: teamColor[p.team] })),
    );

    const balls = await court.locator('[data-kind="ball"]').evaluateAll((all) => all.map((g) => g.getAttribute("transform")));
    expect(balls).toEqual(frame.balls.map(([x, y]) => `translate(${x} ${y})`));

    // The first path of an arrow is where it can be tapped: the whole arrow, untrimmed.
    const arrows = await court.locator('[data-kind="arrow"]').evaluateAll((all) =>
      all.map((g) => g.querySelector("path")!.getAttribute("d")),
    );
    expect(arrows).toEqual(frame.arrows.map((a) => arrowPath({ ...a, kind: "run" })));
  });

  test(`${path}: the court: an image with its label, cropped at 16 metres, nothing sticking out`, async ({ page }) => {
    await page.goto(path);
    const court = page.locator(".board-court svg");
    await expect(court).toHaveAttribute("role", "img");
    await expect(court).toHaveAttribute("aria-label", t.board.court);
    await expect(court).toHaveAttribute("viewBox", "-8 -14 216 174");

    const out = await court.evaluate((svg) => {
      const edge = svg.getBoundingClientRect();
      // The pieces as drawn, without the transparent circles that make them easier to tap.
      const pieces = svg.querySelectorAll('[data-kind="player"] circle:not([fill="transparent"]), [data-kind="ball"] circle:not([fill="transparent"])');
      return [...pieces].flatMap((c) => {
        const r = c.getBoundingClientRect();
        const inside =
          r.left >= edge.left - 0.5 && r.right <= edge.right + 0.5 && r.top >= edge.top - 0.5 && r.bottom <= edge.bottom + 0.5;
        return inside ? [] : [c.parentElement!.getAttribute("transform")];
      });
    });
    expect(out).toEqual([]);
  });

  test(`${path}: the legend: a list with its name, hidden icons, on one line`, async ({ page }) => {
    await page.goto(path);
    const legend = page.getByRole("list", { name: t.board.legend });
    await expect(legend.getByRole("listitem")).toHaveText(Object.values(t.board.kinds));
    const icons = legend.locator("svg");
    await expect(icons).toHaveCount(3);
    for (const icon of await icons.all()) await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icons.nth(1).locator("path")).toHaveAttribute("stroke-dasharray", "3 3");
    for (const i of [0, 2]) await expect(icons.nth(i).locator("path")).not.toHaveAttribute("stroke-dasharray");

    const tops = await legend.getByRole("listitem").evaluateAll((all) => all.map((li) => Math.round(li.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  test(`${path} at 320 px: the label is not cut off`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const cut = await page.locator(".board-label span").evaluate((span) => span.scrollWidth > span.clientWidth);
    expect(cut).toBe(false);
  });

  // One row from a card of 420 px (452 px screen), two rows below it and in the hero's
  // second column at 860 px (a card of 374 px).
  for (const [width, rows] of [[320, 2], [452, 1], [860, 2], [1024, 1]] as const) {
    test(`${path} at ${width} px: the legend and the buttons in ${rows} row${rows > 1 ? "s" : ""}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const legend = await box(page, ".board-legend");
      const controls = await box(page, ".board-controls");
      const card = await box(page, ".board-body");
      if (rows === 1) {
        expect(Math.abs((legend.top + legend.bottom) / 2 - (controls.top + controls.bottom) / 2)).toBeLessThanOrEqual(1);
        expect(legend.right).toBeLessThan(controls.left);
      } else {
        expect(controls.top).toBeGreaterThanOrEqual(legend.bottom);
      }
      expect(legend.left).toBeCloseTo(card.left + 14, 0);
      expect(controls.right).toBeCloseTo(card.right - 14, 0);
      // The legend's items fit inside it.
      const right = await page.locator(".board-legend li").last().evaluate((li) => li.getBoundingClientRect().right);
      expect(right).toBeLessThanOrEqual(legend.right + 0.5);
    });
  }

  test(`${path}: loads only the island's scripts: the card, the renderer and Svelte's runtime`, async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const island = page.locator("astro-island");
    await expect(island).toHaveCount(1);
    await expect(island).toHaveAttribute("client", "visible");
    await expect(page.locator("script[src]")).toHaveCount(0);
    const card = (await island.getAttribute("component-url"))!;
    const renderer = (await island.getAttribute("renderer-url"))!;
    expect(scripts).toHaveLength(3);
    expect(scripts).toEqual(expect.arrayContaining([card, renderer]));
    for (const src of scripts) expect(src).toMatch(/^\/_astro\/[^/]+\.js$/);
  });

  test(`${path}: every id is unique, and every url(#…) points to one`, async ({ page }) => {
    await page.goto(path);
    const { ids, missing } = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
      const refs = [...document.querySelectorAll("*")].flatMap((el) =>
        [...el.attributes].flatMap((a) => [...a.value.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!)),
      );
      return { ids, missing: refs.filter((id) => !document.getElementById(id)) };
    });
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(missing).toEqual([]);
  });
}

test.describe("with JavaScript, playing", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const { path, t } of pages) {
    test(`${path}: three buttons, on: Previous, Stop and Next, 44 × 44 px, on the right; Play is green`, async ({ page }) => {
      await page.goto(path);
      const buttons = page.getByRole("button");
      await expect(buttons).toHaveCount(3);
      const names = [t.board.prev, t.board.stop, t.board.next];
      for (const [i, name] of names.entries()) {
        const button = buttons.nth(i);
        await expect(button).toHaveAccessibleName(name);
        await expect(button).toHaveAttribute("title", name);
        await expect(button).toBeEnabled();
        await expect(button).not.toHaveAttribute("aria-disabled");
        await expect(button).toHaveCSS("opacity", "1");
        const b = (await button.boundingBox())!;
        expect([b.width, b.height]).toEqual([44, 44]);
      }
      const card = await box(page, ".board-body");
      const last = (await buttons.nth(2).boundingBox())!;
      expect(last.x + last.width).toBeCloseTo(card.right - 14, 0);
      await expect(buttons.nth(1)).toHaveCSS("background-color", "rgb(21, 128, 61)");
    });
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const { path, t, locale } of pages) {
    test(`${path}: step 1, with the buttons off`, async ({ page }) => {
      await page.goto(path);
      const board = await boardFrom(boards[locale]);
      await expect(page.locator(".board-step")).toHaveText(board.frames[0]!.text!);
      await expect(page.locator(".board-count [aria-hidden=true]")).toHaveText("1/4");
      await expect(page.locator(".board-court svg [data-kind=player]")).toHaveCount(13);
      await expect(page.getByRole("list", { name: t.board.legend }).getByRole("listitem")).toHaveCount(3);
      for (const button of await page.getByRole("button").all()) await expect(button).toBeDisabled();
      await expect(page.getByRole("button")).toHaveCount(3);
    });

    // The narrowest card (288 px); a wider one only makes it easier. Without JavaScript,
    // so Svelte doesn't put the sentence back.
    test(`${path} at 320 px: every sentence of the board fits in two lines`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const sentences = (await boardFrom(boards[locale])).frames.map((f) => f.text!);
      for (const sentence of sentences) {
        const fit = await page.locator(".board-step").evaluate((p, text) => {
          p.textContent = text;
          const range = document.createRange();
          range.selectNodeContents(p);
          const rects = [...range.getClientRects()];
          const box = p.getBoundingClientRect();
          return {
            lines: new Set(rects.map((r) => Math.round(r.top))).size,
            inside: Math.max(...rects.map((r) => r.bottom)) <= box.bottom + 0.5,
            height: Math.round(box.height * 10) / 10,
          };
        }, sentence);
        expect(fit.lines, sentence).toBeLessThanOrEqual(2);
        expect(fit, sentence).toMatchObject({ inside: true, height: 47.6 });
      }
    });

    test(`${path}: three buttons, off, 44 × 44 px, on the right; Play is green`, async ({ page }) => {
      await page.goto(path);
      const buttons = page.getByRole("button");
      await expect(buttons).toHaveCount(3);
      const names = [t.board.prev, t.board.play, t.board.next];
      for (const [i, name] of names.entries()) {
        const button = buttons.nth(i);
        await expect(button).toHaveAccessibleName(name);
        await expect(button).toHaveAttribute("title", name);
        await expect(button).toBeDisabled();
        const b = (await button.boundingBox())!;
        expect([b.width, b.height]).toEqual([44, 44]);
      }
      const card = await box(page, ".board-body");
      const last = (await buttons.nth(2).boundingBox())!;
      expect(last.x + last.width).toBeCloseTo(card.right - 14, 0);
      await expect(page.getByRole("button", { name: t.board.play })).toHaveCSS("background-color", "rgb(21, 128, 61)");
    });
  }
});
