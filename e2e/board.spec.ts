import type { Page } from "@playwright/test";
import { boardFrom, boards, stepsFor } from "../src/data/boards";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import { arrowPath } from "../src/lib/board/geometry";
import { expect, test } from "./helpers";

// The hero (Hars, 15 November 2026): step 1 of the share link, rendered at build
// time: the counter with the play button, the sentence, the four step lines, the
// link to Coachboard, and the court with the label that follows the ball. With
// reduced motion, so the island plays nothing and step 1 stays; e2e/play.spec.ts
// tests the playing.

test.use({ reducedMotion: "reduce" });

const pages = [
  { path: "/", t: nl, locale: "nl" as const },
  { path: "/en/", t: en, locale: "en" as const },
];

/** The colour of each team in Court.svelte (board.css gives it its Hars token). */
const teamColor = { a: "#15803d", d: "#0f172a", p: "#2563eb" };

/** The sides of an element's box. */
const box = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });

const fill = (template: string, n: number) => template.replace("{n}", String(n)).replace("{count}", "4");

for (const { path, t, locale } of pages) {
  test(`${path}: step 1 with the counter, the sentence and its line`, async ({ page }) => {
    await page.goto(path);
    const board = await boardFrom(boards[locale]);
    await expect(page.locator(".board-count [aria-hidden=true]")).toHaveText(fill(t.board.counter, 1));
    await expect(page.locator(".board-count .visually-hidden")).toHaveText(fill(t.board.step, 1));
    const step = page.locator(".board-step");
    await expect(step).toHaveText(board.frames[0]!.text!);
    await expect(step).toHaveAttribute("aria-live", "polite");
    await expect(step).toHaveAttribute("aria-atomic", "true");
    await expect(page.locator(".board-steps [aria-current=step]")).toHaveCount(1);
    await expect(page.locator(".board-steps button").first()).toHaveAttribute("aria-current", "step");
  });

  test(`${path}: the step lines: a list with its name, a button per step with its number and kind`, async ({ page }) => {
    await page.goto(path);
    const lines = stepsFor(await boardFrom(boards[locale]), locale);
    const list = page.getByRole("list", { name: t.board.steps });
    const buttons = list.getByRole("button");
    await expect(buttons).toHaveCount(4);
    for (const [i, line] of lines.entries()) {
      const button = buttons.nth(i);
      // The name is the number and the kind; where the arrow goes is only to see.
      await expect(button).toHaveAccessibleName(`0${i + 1} ${line.kind}`);
      await expect(button.locator(".data")).toHaveText(`${line.from}${line.to}`);
      await expect(button.locator(".data")).toHaveAttribute("aria-hidden", "true");
      await expect(button.locator(".kind")).toHaveCSS("text-transform", "uppercase");
    }
  });

  test(`${path}: the link gives the board the hero shows`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole("link", { name: t.hero.button, exact: true });
    const frame = (await boardFrom((await link.getAttribute("href"))!)).frames[0]!;
    const court = page.locator(".board-court svg[role=img]");

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
    const court = page.locator(".board-court svg[role=img]");
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

  // Kay: colour is never the only sign. Every attacker and the keeper have a label;
  // the ball has one beside it, which follows it (play.spec.ts).
  for (const width of [320, 1440]) {
    test(`${path} at ${width} px: the ball's label, beside the ball, hidden from screen readers`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const label = page.locator(".board-ball text");
      await expect(label).toHaveText(`${t.board.ball} ${locale === "nl" ? "[11,0; 12,2]" : "[11.0, 12.2]"}`);
      await expect(page.locator(".board-ball")).toHaveAttribute("aria-hidden", "true");
      const ball = (await page.locator('.board-court [data-kind="ball"] circle:not([fill="transparent"])').boundingBox())!;
      const text = (await label.boundingBox())!;
      // Every measure of the label, in each failure's message: the browsers don't agree on a
      // text's box (WebKit in CI, 17 November 2026), and CI is the only place WebKit runs.
      const seen = JSON.stringify({
        ball,
        text,
        ...(await label.evaluate((el: SVGTextElement) => {
          const flat = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
          const range = document.createRange();
          range.selectNodeContents(el);
          return { glyphs: flat(range.getBoundingClientRect()), bbox: flat(el.getBBox()), origin: flat(el.ownerSVGElement!.getBoundingClientRect()), size: getComputedStyle(el).fontSize };
        })),
      });
      // Above the ball and to its right, within 24 px of it.
      expect(text.x, seen).toBeGreaterThan(ball.x + ball.width / 2);
      expect(text.x - (ball.x + ball.width), seen).toBeLessThan(24);
      expect(text.y + text.height, seen).toBeLessThan(ball.y + ball.height);
      expect(ball.y - (text.y + text.height), seen).toBeLessThan(24);
      expect(text.x + text.width, seen).toBeLessThanOrEqual(width);
    });
  }

  // Narrow: the court above the text. From 860 px: the text left, the court right, beside each other.
  for (const width of [320, 390, 700, 1024, 1440]) {
    test(`${path} at ${width} px: the court ${width < 860 ? "above" : "beside"} the text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const court = await box(page, ".board-court");
      const text = await box(page, ".board-text");
      expect(court.height).toBeCloseTo((court.width * 174) / 216, 0);
      if (width < 860) {
        expect(court.bottom).toBeLessThanOrEqual(text.top);
        expect(court.width).toBeCloseTo(text.width, 0);
      } else {
        expect(text.right).toBeLessThan(court.left);
        expect(Math.abs((text.top + text.bottom) / 2 - (court.top + court.bottom) / 2)).toBeLessThanOrEqual(1);
      }
      expect(court.right).toBeLessThanOrEqual(width);
    });
  }

  test(`${path}: loads only the islands' scripts: the hero, the figures, the lens, the renderer and Svelte's runtime`, async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
    });
    await page.goto(path);
    // Down to the lens, so all three hydrate.
    await page.locator(".lens-frame").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    const islands = page.locator("astro-island");
    await expect(islands).toHaveCount(3);
    for (const island of await islands.all()) await expect(island).toHaveAttribute("client", "visible");
    await expect(page.locator("script[src]")).toHaveCount(0);
    const own = await islands.evaluateAll((all) => all.flatMap((el) => [el.getAttribute("component-url")!, el.getAttribute("renderer-url")!]));
    expect(scripts).toEqual(expect.arrayContaining(own));
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

test.describe("with JavaScript", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const { path, t } of pages) {
    test(`${path}: Stop and the four step lines, on; Stop amber, 44 × 44 px; each line 48 px high`, async ({ page }) => {
      await page.goto(path);
      const play = page.locator(".board-top .play");
      await expect(play).toHaveAccessibleName(t.board.stop);
      await expect(play).toHaveAttribute("title", t.board.stop);
      await expect(play).toBeEnabled();
      await expect(play).toHaveCSS("background-color", "rgb(255, 179, 0)");
      const b = (await play.boundingBox())!;
      expect([b.width, b.height]).toEqual([44, 44]);
      const lines = page.locator(".board-steps button");
      await expect(lines).toHaveCount(4);
      for (const line of await lines.all()) {
        await expect(line).toBeEnabled();
        await expect(line).not.toHaveAttribute("aria-disabled");
        expect((await line.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      }
    });
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const { path, t, locale } of pages) {
    test(`${path}: step 1, with the buttons off and the link on`, async ({ page }) => {
      await page.goto(path);
      const board = await boardFrom(boards[locale]);
      await expect(page.locator(".board-step")).toHaveText(board.frames[0]!.text!);
      await expect(page.locator(".board-count [aria-hidden=true]")).toHaveText(fill(t.board.counter, 1));
      await expect(page.locator(".board-court svg [data-kind=player]")).toHaveCount(13);
      await expect(page.locator(".board-ball text")).toBeVisible();
      await expect(page.getByRole("button")).toHaveCount(5);
      for (const button of await page.getByRole("button").all()) await expect(button).toBeDisabled();
      await expect(page.getByRole("button", { name: t.board.play })).toHaveCSS("background-color", "rgb(255, 179, 0)");
      await expect(page.getByRole("link", { name: t.hero.button, exact: true })).toHaveAttribute("href", boards[locale]);
    });

    // The narrowest column (288 px); a wider one only makes it easier. Without JavaScript,
    // so Svelte doesn't put the sentence back. Two words: a line each, the box always two
    // lines high. A longer sentence (the English board, for now): at most three lines.
    test(`${path} at 320 px: every sentence of the board fits its box`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const sentences = (await boardFrom(boards[locale])).frames.map((f) => f.text!);
      const long = sentences.some((s) => s.split(" ").length !== 2);
      for (const sentence of sentences) {
        const fit = await page.locator(".board-step").evaluate(
          (p, [text, long]) => {
            const [first, second] = (text as string).split(" ");
            if (long) p.textContent = text as string;
            else p.innerHTML = `<span>${first}</span> <span>${second}</span>`;
            // The boxes of the text itself, not of the spans: one per line of each text node.
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            const rects: DOMRect[] = [];
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              if (!node.textContent!.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              rects.push(...range.getClientRects());
            }
            const box = p.getBoundingClientRect();
            const size = parseFloat(getComputedStyle(p).fontSize);
            return {
              lines: new Set(rects.map((r) => Math.round(r.top))).size,
              // Not wider than its column. Its height is checked below: with a line-height of 1 a
              // glyph's own box is taller than its line, so its bottom says nothing.
              inside: Math.max(...rects.map((r) => r.right)) <= box.right + 0.5,
              lineHeights: Math.round((box.height / size) * 100) / 100,
            };
          },
          [sentence, long] as const,
        );
        expect(fit.inside, sentence).toBe(true);
        if (long) {
          expect(fit.lines, sentence).toBeLessThanOrEqual(3);
          expect(fit.lineHeights, sentence).toBe(3.15);
        } else {
          expect(fit.lines, sentence).toBe(2);
          expect(fit.lineHeights, sentence).toBe(2);
        }
      }
    });
  }
});
