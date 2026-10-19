import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { boardFrom, boards } from "../src/data/boards";
import { en } from "../src/i18n/en";
import { nl } from "../src/i18n/nl";
import type { Board, Frame } from "../src/lib/board/format";
import { moment } from "../src/lib/board/play";
import { moveFor, stillFor } from "../src/lib/board/viewer";
import { expect, test } from "./helpers";

// The board plays (phase 5): by itself in a loop, Stop, Next and Previous,
// reduced motion, pausing out of view and in a hidden tab, aria-live (off while
// it plays by itself, polite once it stands still), and a card that doesn't move.
// Playwright's clock is paused before the page loads; runFor() plays it frame
// by frame. The first frame counts 0 ms, so the tests keep 50 ms of margin,
// as viewer.spec.ts does in Coachboard.

const pages = [
  { path: "/", t: nl, locale: "nl" as const },
  { path: "/en/", t: en, locale: "en" as const },
];

const MARGIN = 50;
/** The 2.6 s after the shot: HOLD in BoardCard.svelte, which Playwright can't import (crossing.test.ts checks it). */
const HOLD = 2600;

type Places = { players: [number, number][]; balls: [number, number][] };

const places = (frame: Frame): Places => ({ players: frame.players.map((p) => p.at), balls: frame.balls });

/** Where every player and ball is on the court now. */
const onCourt = (page: Page): Promise<Places> =>
  page.locator(".board-court svg").evaluate((svg) => {
    const at = (kind: string) =>
      [...svg.querySelectorAll(`[data-kind="${kind}"]`)].map((g) => {
        const [, x, y] = g.getAttribute("transform")!.match(/translate\(([-\d.e]+) ([-\d.e]+)\)/)!;
        return [Number(x), Number(y)] as [number, number];
      });
    return { players: at("player"), balls: at("ball") };
  });

/** The largest distance of a piece from where `expected` has it. */
function distance(a: Places, expected: Places) {
  const pairs = [...a.players.map((p, i) => [p, expected.players[i]!]), ...a.balls.map((b, i) => [b, expected.balls[i]!])];
  return Math.max(...pairs.map(([[x1, y1], [x2, y2]]) => Math.hypot(x1! - x2!, y1! - y2!)));
}

/** Opens `path` with the clock paused before it loads, and waits until the buttons work. */
async function openPaused(page: Page, path: string) {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00") });
  await page.clock.pauseAt(new Date("2026-10-19T12:00:01"));
  await page.goto(path);
  await expect(page.locator(".board-controls .play")).toBeEnabled();
}

/** The parts of the card. */
function card(page: Page) {
  const buttons = page.locator(".board-controls button");
  return {
    counter: page.locator(".board-count [aria-hidden=true]"),
    sentence: page.locator(".board-step"),
    prev: buttons.nth(0),
    play: buttons.nth(1),
    next: buttons.nth(2),
  };
}

/** One round of the board: when each step starts and stands still, and when the shot ends (ms after mounting). */
function timeline(board: Board) {
  let t = 0;
  const steps = board.frames.map((f) => {
    const start = t;
    t += stillFor(f) + moveFor(f);
    return { start, still: stillFor(f), move: moveFor(f) };
  });
  return { steps, shot: t, round: t + HOLD };
}

const decoded = {} as Record<"nl" | "en", Board>;
test.beforeAll(async () => {
  for (const { locale } of pages) decoded[locale] = await boardFrom(boards[locale]);
});

for (const { path, t, locale } of pages) {
  test.describe(path, () => {
    /** Plays the paused clock on to `ms` after mounting. */
    let now = 0;
    const playTo = async (page: Page, ms: number) => {
      await page.clock.runFor(ms - now);
      now = ms;
    };
    test.beforeEach(() => {
      now = 0;
    });

    test("plays by itself once mounted: Stop, the buttons on, aria-live off", async ({ page }) => {
      await openPaused(page, path);
      const c = card(page);
      await expect(c.play).toHaveAccessibleName(t.board.stop);
      await expect(c.play).toHaveAttribute("title", t.board.stop);
      for (const button of [c.prev, c.play, c.next]) {
        await expect(button).toBeEnabled();
        await expect(button).not.toHaveAttribute("aria-disabled");
      }
      await expect(c.sentence).toHaveAttribute("aria-live", "off");
    });

    test("a round: each step still long enough to read, then its move, the shot, 2.6 s, and again", async ({ page }) => {
      const board = decoded[locale];
      const { steps, shot, round } = timeline(board);
      await openPaused(page, path);
      const c = card(page);

      for (const [s, { start, still, move }] of steps.entries()) {
        await playTo(page, start + still - MARGIN);
        await expect(c.counter).toHaveText(`${s + 1}/4`);
        await expect(c.sentence).toHaveText(board.frames[s]!.text!);
        expect(await onCourt(page), `step ${s + 1}`).toEqual(places(board.frames[s]!));

        await playTo(page, start + still + move / 2);
        await expect(c.counter).toHaveText(`${s + 1}/4`);
        // Halfway, or at most 50 ms behind: as far as the fastest piece gets in that time.
        const half = await onCourt(page);
        const expected = places(moment(board, s, 0.5));
        const slack = distance(places(moment(board, s, 0.5 - MARGIN / move)), expected);
        expect(distance(half, expected), `halfway step ${s + 1}`).toBeLessThanOrEqual(slack + 0.5);
        expect(distance(half, places(board.frames[s]!)), `halfway step ${s + 1}`).toBeGreaterThan(5);
      }
      await playTo(page, shot + MARGIN);
      await expect(c.counter).toHaveText("4/4");
      expect((await onCourt(page)).balls).toEqual([[100, 0]]);

      await playTo(page, round - MARGIN);
      await expect(c.counter).toHaveText("4/4");
      expect((await onCourt(page)).balls).toEqual([[100, 0]]);

      await playTo(page, round + MARGIN);
      await expect(c.counter).toHaveText("1/4");
      await expect(c.sentence).toHaveText(board.frames[0]!.text!);
      expect(await onCourt(page)).toEqual(places(board.frames[0]!));
      await expect(c.play).toHaveAccessibleName(t.board.stop);
    });

    test("halfway through step 1, the centre back is between (100, 130) and (75, 95)", async ({ page }) => {
      const { steps } = timeline(decoded[locale]);
      await openPaused(page, path);
      await playTo(page, steps[0]!.still + steps[0]!.move / 2);
      const [x, y] = (await onCourt(page)).players[2]!;
      expect(x).toBeGreaterThan(75);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(95);
      expect(y).toBeLessThan(130);
    });

    test("Stop: in a move back to the step's start, nothing changes for 10 s, Play starts at step 1", async ({ page }) => {
      const board = decoded[locale];
      const { steps } = timeline(board);
      await openPaused(page, path);
      const c = card(page);

      await playTo(page, steps[1]!.start + steps[1]!.still + 500);
      await c.play.click();
      await expect(c.counter).toHaveText("2/4");
      expect(await onCourt(page)).toEqual(places(board.frames[1]!));
      await expect(c.play).toHaveAccessibleName(t.board.play);
      await expect(c.play).toHaveAttribute("title", t.board.play);
      await expect(c.sentence).toHaveAttribute("aria-live", "polite");

      await playTo(page, now + 10_000);
      await expect(c.counter).toHaveText("2/4");
      expect(await onCourt(page)).toEqual(places(board.frames[1]!));

      await c.play.click();
      await expect(c.counter).toHaveText("1/4");
      await expect(c.play).toHaveAccessibleName(t.board.stop);
      await expect(c.sentence).toHaveAttribute("aria-live", "off");
      expect(await onCourt(page)).toEqual(places(board.frames[0]!));
      await playTo(page, now + steps[0]!.still + MARGIN + steps[0]!.move);
      await expect(c.counter).toHaveText("2/4");
    });

    test("Next, standing still: plays the move and stays on the new step", async ({ page }) => {
      const board = decoded[locale];
      await openPaused(page, path);
      const c = card(page);
      await c.play.click();
      await expect(c.play).toHaveAccessibleName(t.board.play);

      await c.next.click();
      await playTo(page, now + 500);
      await expect(c.counter).toHaveText("1/4");
      expect(distance(await onCourt(page), places(board.frames[0]!))).toBeGreaterThan(5);
      await playTo(page, now + 500 + MARGIN);
      await expect(c.counter).toHaveText("2/4");
      expect(await onCourt(page)).toEqual(places(board.frames[1]!));

      await playTo(page, now + 5000);
      await expect(c.counter).toHaveText("2/4");
      expect(await onCourt(page)).toEqual(places(board.frames[1]!));
      await expect(c.play).toHaveAccessibleName(t.board.play);
    });

    test("Next while it plays: stops, and goes to the next step at once", async ({ page }) => {
      const board = decoded[locale];
      await openPaused(page, path);
      const c = card(page);
      await playTo(page, 500);
      await c.next.click();
      await expect(c.counter).toHaveText("2/4");
      expect(await onCourt(page)).toEqual(places(board.frames[1]!));
      await expect(c.play).toHaveAccessibleName(t.board.play);
      await playTo(page, now + 5000);
      await expect(c.counter).toHaveText("2/4");
    });

    test("Next on step 4 plays the shot; then Next is aria-disabled and keeps the focus", async ({ page }) => {
      const board = decoded[locale];
      const { steps } = timeline(board);
      await openPaused(page, path);
      const c = card(page);
      await playTo(page, steps[3]!.start + 500);
      await c.play.click();
      await expect(c.counter).toHaveText("4/4");

      // The keyboard, as Safari doesn't focus a button on a click.
      await c.next.focus();
      await page.keyboard.press("Enter");
      await playTo(page, now + steps[3]!.move + MARGIN);
      expect((await onCourt(page)).balls).toEqual([[100, 0]]);
      await expect(c.next).toHaveAttribute("aria-disabled", "true");
      await expect(c.next).toBeFocused();
      await expect(c.next).toHaveCSS("opacity", "0.4");

      await page.keyboard.press("Enter");
      await playTo(page, now + 1000);
      await expect(c.counter).toHaveText("4/4");
      expect((await onCourt(page)).balls).toEqual([[100, 0]]);
      await expect(c.next).toBeFocused();
    });

    test("Previous: a step back, to the step's start while something moves, also while playing", async ({ page }) => {
      const board = decoded[locale];
      const { steps } = timeline(board);
      await openPaused(page, path);
      const c = card(page);

      // Playing, step 2 still: one step back.
      await playTo(page, steps[1]!.start + 500);
      await expect(c.counter).toHaveText("2/4");
      await c.prev.click();
      await expect(c.counter).toHaveText("1/4");
      expect(await onCourt(page)).toEqual(places(board.frames[0]!));
      await expect(c.play).toHaveAccessibleName(t.board.play);

      // Playing, step 2 moving: the start of step 2.
      await c.play.click();
      await expect(c.play).toHaveAccessibleName(t.board.stop);
      await playTo(page, now + steps[1]!.start + steps[1]!.still + 500);
      await expect(c.counter).toHaveText("2/4");
      await c.prev.click();
      await expect(c.play).toHaveAccessibleName(t.board.play);
      await expect(c.counter).toHaveText("2/4");
      expect(await onCourt(page)).toEqual(places(board.frames[1]!));

      // Standing still on step 2: step 1; there Previous is aria-disabled.
      await c.prev.click();
      await expect(c.counter).toHaveText("1/4");
      await expect(c.prev).toHaveAttribute("aria-disabled", "true");
      // Playwright counts aria-disabled as off, so the click is forced: it does nothing.
      await c.prev.click({ force: true });
      await expect(c.counter).toHaveText("1/4");
    });

    test("Previous after the shot: the start of step 4", async ({ page }) => {
      const board = decoded[locale];
      const { shot } = timeline(board);
      await openPaused(page, path);
      const c = card(page);
      await playTo(page, shot + 500);
      await expect(c.counter).toHaveText("4/4");
      await c.prev.click();
      await expect(c.play).toHaveAccessibleName(t.board.play);
      await expect(c.counter).toHaveText("4/4");
      expect(await onCourt(page)).toEqual(places(board.frames[3]!));
      await expect(c.next).not.toHaveAttribute("aria-disabled");
    });

    test("Stop after the shot: the board stays at the end; Play starts at step 1", async ({ page }) => {
      const board = decoded[locale];
      const { shot } = timeline(board);
      await openPaused(page, path);
      const c = card(page);
      await playTo(page, shot + 500);
      await c.play.click();
      await expect(c.play).toHaveAccessibleName(t.board.play);
      await playTo(page, now + 5000);
      await expect(c.counter).toHaveText("4/4");
      expect((await onCourt(page)).balls).toEqual([[100, 0]]);
      await expect(c.next).toHaveAttribute("aria-disabled", "true");

      await c.play.click();
      await expect(c.counter).toHaveText("1/4");
      expect(await onCourt(page)).toEqual(places(board.frames[0]!));
    });

    test("pauses out of view: nothing changes for 10 s, and back in view it goes on", async ({ page }) => {
      const { steps } = timeline(decoded[locale]);
      await openPaused(page, path);
      const c = card(page);
      await playTo(page, steps[0]!.still + 250);
      const before = await onCourt(page);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect.poll(() => page.locator(".board").evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(0);
      await page.waitForTimeout(300); // real time, for the IntersectionObserver
      await playTo(page, now + 10_000);
      await expect(c.counter).toHaveText("1/4");
      expect(await onCourt(page)).toEqual(before);
      await expect(c.play).toHaveAccessibleName(t.board.stop);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await playTo(page, now + 500);
      await expect(c.counter).toHaveText("1/4");
      expect(distance(await onCourt(page), before)).toBeGreaterThan(5);
      await playTo(page, now + 300 + MARGIN);
      await expect(c.counter).toHaveText("2/4");
    });

    test("pauses in a hidden tab: nothing changes for 10 s, and visible again it goes on", async ({ page }) => {
      const { steps } = timeline(decoded[locale]);
      await openPaused(page, path);
      const c = card(page);
      await playTo(page, steps[0]!.still + 250);
      const before = await onCourt(page);

      // The test browsers keep a page visible behind another one, so this sets document.hidden itself.
      const setHidden = (hidden: boolean) =>
        page.evaluate((hidden) => {
          Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
          Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
          document.dispatchEvent(new Event("visibilitychange"));
        }, hidden);
      await setHidden(true);
      await playTo(page, now + 10_000);
      await expect(c.counter).toHaveText("1/4");
      expect(await onCourt(page)).toEqual(before);
      await expect(c.play).toHaveAccessibleName(t.board.stop);
      await expect(c.sentence).toHaveAttribute("aria-live", "off");

      await setHidden(false);
      await playTo(page, now + 500);
      expect(distance(await onCourt(page), before)).toBeGreaterThan(5);
      await playTo(page, now + 300 + MARGIN);
      await expect(c.counter).toHaveText("2/4");
    });

    test("reduced motion turned on while it plays: it stops on the step's start", async ({ page }) => {
      const board = decoded[locale];
      const { steps } = timeline(board);
      await openPaused(page, path);
      const c = card(page);
      await playTo(page, steps[0]!.still + 500);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(c.play).toHaveAccessibleName(t.board.play);
      await expect(c.counter).toHaveText("1/4");
      expect(await onCourt(page)).toEqual(places(board.frames[0]!));
      await playTo(page, now + 5000);
      expect(await onCourt(page)).toEqual(places(board.frames[0]!));
    });

    test("the card and the hero button keep their box at every step, move, the end and Stop", async ({ page }) => {
      const { steps, shot } = timeline(decoded[locale]);
      await openPaused(page, path);
      const boxes = () =>
        page.evaluate(() =>
          [".board", ".hero-button"].map((selector) => {
            const r = document.querySelector(selector)!.getBoundingClientRect();
            return [r.left, r.top, r.width, r.height];
          }),
        );
      const loaded = await boxes();
      const same = async (what: string) => {
        for (const [i, box] of (await boxes()).entries()) {
          for (const [j, value] of box.entries()) expect(Math.abs(value - loaded[i]![j]!), what).toBeLessThanOrEqual(0.5);
        }
      };
      for (const [s, { start, still, move }] of steps.entries()) {
        await playTo(page, start + still - MARGIN);
        await same(`step ${s + 1}`);
        await playTo(page, start + still + move / 2);
        await same(`halfway step ${s + 1}`);
      }
      await playTo(page, shot + 500);
      await same("after the shot");
      await card(page).play.click();
      await expect(card(page).play).toHaveAccessibleName(t.board.play);
      await same("after Stop");
    });

    test("aria-live: off while it plays by itself, polite for Next and Previous, set before the sentence changes", async ({ page }) => {
      const board = decoded[locale];
      const { steps, round } = timeline(board);
      await openPaused(page, path);
      const c = card(page);

      // The value of aria-live at each change of the sentence, from the order of the
      // records: in the callback the attribute already has its value after the update.
      // And the callback (one update) of each change, to see that aria-live changes in an earlier one.
      await page.evaluate(() => {
        const p = document.querySelector(".board-step")!;
        const log = { sentences: [] as [string, string | null][], updates: [] as string[] };
        (window as unknown as { order: typeof log }).order = log;
        let live = p.getAttribute("aria-live");
        let update = 0;
        new MutationObserver((records) => {
          update++;
          let text = false;
          records.forEach((m, i) => {
            if (m.type === "attributes") {
              const next = records.slice(i + 1).find((n) => n.type === "attributes");
              live = next ? next.oldValue : p.getAttribute("aria-live");
              log.updates.push(`${update}: aria-live ${live}`);
            } else if (!text) {
              text = true;
              log.sentences.push([p.textContent!, live]);
              log.updates.push(`${update}: sentence`);
            }
          });
        }).observe(p, {
          attributes: true,
          attributeFilter: ["aria-live"],
          attributeOldValue: true,
          characterData: true,
          childList: true,
          subtree: true,
        });
      });

      // A whole round by itself.
      await playTo(page, round + MARGIN);
      await expect(c.counter).toHaveText("1/4");
      // Next while it plays.
      await c.next.click();
      await expect(c.counter).toHaveText("2/4");
      // Play.
      await c.play.click();
      await expect(c.counter).toHaveText("1/4");
      await expect(c.play).toHaveAccessibleName(t.board.stop);
      // Step 1 plays on.
      await playTo(page, now + steps[0]!.still + steps[0]!.move + MARGIN);
      await expect(c.counter).toHaveText("2/4");
      // Previous while it plays, step 2 standing still.
      await c.prev.click();
      await expect(c.counter).toHaveText("1/4");

      const { sentences, updates } = await page.evaluate(() => (window as unknown as { order: { sentences: [string, string][]; updates: string[] } }).order);
      const text = (s: number) => board.frames[s]!.text!;
      expect(sentences).toEqual([
        [text(1), "off"],
        [text(2), "off"],
        [text(3), "off"],
        [text(0), "off"],
        [text(1), "polite"],
        [text(0), "off"],
        [text(1), "off"],
        [text(0), "polite"],
      ]);
      // Next, Play and Previous: aria-live in an update of its own, before the sentence's.
      const update = (line: string) => Number(line.split(":")[0]);
      const changes = updates.filter((line) => line.includes("aria-live"));
      expect(changes.map((line) => line.split(": ")[1])).toEqual(["aria-live polite", "aria-live off", "aria-live polite"]);
      for (const change of changes) {
        const sentence = updates.find((line) => line.endsWith("sentence") && update(line) >= update(change));
        expect(update(sentence!), `${change} before the sentence`).toBeGreaterThan(update(change));
      }
    });

    // axe with the clock running again: it may wait on timers of its own.
    const axe = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

    test("axe: no violations while it plays", async ({ page }) => {
      await openPaused(page, path);
      await playTo(page, timeline(decoded[locale]).steps[0]!.still + 500);
      await page.clock.resume();
      await expect(card(page).play).toHaveAccessibleName(t.board.stop);
      expect((await axe(page)).violations).toEqual([]);
    });

    test("axe: no violations at the end, with Next aria-disabled", async ({ page }) => {
      await openPaused(page, path);
      await playTo(page, timeline(decoded[locale]).shot + 500);
      await card(page).play.click();
      await expect(card(page).next).toHaveAttribute("aria-disabled", "true");
      await page.clock.resume();
      expect((await axe(page)).violations).toEqual([]);
    });
  });
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const { path, t, locale } of pages) {
    test(`${path}: nothing plays by itself: 20 s on step 1, Play, aria-live polite`, async ({ page }) => {
      const board = decoded[locale];
      await openPaused(page, path);
      const c = card(page);
      await page.clock.runFor(20_000);
      await expect(c.counter).toHaveText("1/4");
      expect(await onCourt(page)).toEqual(places(board.frames[0]!));
      await expect(c.play).toHaveAccessibleName(t.board.play);
      await expect(c.sentence).toHaveAttribute("aria-live", "polite");
      await expect(c.prev).toHaveAttribute("aria-disabled", "true");
      await expect(c.next).not.toHaveAttribute("aria-disabled");
    });

    test(`${path}: Next goes to step 2 at once`, async ({ page }) => {
      const board = decoded[locale];
      await openPaused(page, path);
      const c = card(page);
      await c.next.click();
      await expect(c.counter).toHaveText("2/4");
      expect(await onCourt(page)).toEqual(places(board.frames[1]!));
    });

    test(`${path}: Play jumps from step to step, never in between, in a loop`, async ({ page }) => {
      const board = decoded[locale];
      const { round } = timeline(board);
      await openPaused(page, path);
      const c = card(page);
      await c.play.click();
      await expect(c.play).toHaveAccessibleName(t.board.stop);

      const allowed = [...board.frames.map(places), places(moment(board, board.frames.length - 1, 1))].map((p) => JSON.stringify(p));
      const seen = new Set<string>();
      for (let ms = 0; ms <= round + 500; ms += 100) {
        await page.clock.runFor(100);
        const where = JSON.stringify(await onCourt(page));
        expect(allowed, `${ms} ms`).toContain(where);
        seen.add(where);
      }
      expect(seen.size).toBe(allowed.length);
      await expect(c.counter).toHaveText("1/4");
    });

    test(`${path}: the card keeps its box`, async ({ page }) => {
      await openPaused(page, path);
      const box = () => page.locator(".board").boundingBox();
      const loaded = await box();
      await card(page).play.click();
      for (let i = 0; i < 14; i++) {
        await page.clock.runFor(1000);
        const now = (await box())!;
        expect(Math.abs(now.height - loaded!.height)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(now.y - loaded!.y)).toBeLessThanOrEqual(0.5);
      }
    });
  }
});

test.describe("hydrating", () => {
  for (const { path } of pages) {
    test(`${path}: adds and removes no element, and keeps the card's box`, async ({ page }) => {
      // Holds the island's module until the observer watches the card.
      let release!: () => void;
      const held = new Promise<void>((resolve) => (release = resolve));
      await page.route("**/_astro/BoardCard.*.js", async (route) => {
        await held;
        await route.continue();
      });
      await page.clock.install({ time: new Date("2026-10-19T12:00:00") });
      await page.clock.pauseAt(new Date("2026-10-19T12:00:01"));
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".board-controls .play")).toBeDisabled();
      const before = await page.locator(".board").boundingBox();
      await page.evaluate(() => {
        const seen: string[] = [];
        (window as unknown as { childList: string[] }).childList = seen;
        new MutationObserver((records) => {
          for (const m of records) if (m.type === "childList") seen.push((m.target as Element).outerHTML?.slice(0, 80) ?? "text");
        }).observe(document.querySelector(".board")!, { childList: true, subtree: true });
      });
      release();
      await expect(page.locator(".board-controls .play")).toBeEnabled();
      expect(await page.evaluate(() => (window as unknown as { childList: string[] }).childList)).toEqual([]);
      expect(await page.locator(".board").boundingBox()).toEqual(before);
    });
  }
});

// Layout shifts while it plays, in real time. Only Chromium: WebKit has no Layout
// Instability API. With the paused clock the browser paints no moves, so no shifts either.
test(`/: no layout shift in the card or the hero button during a round`, async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebKit has no Layout Instability API");
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const sources: string[] = [];
    (window as unknown as { shifts: string[] }).shifts = sources;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { sources: { node?: Node }[] }[]) {
        for (const { node } of entry.sources) {
          const el = node instanceof Element ? node : node?.parentElement;
          if (el?.closest(".board, .hero-button")) sources.push(el.outerHTML.slice(0, 80));
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await expect(card(page).play).toHaveAccessibleName(nl.board.stop);
  await page.waitForTimeout(timeline(decoded.nl).round + 500);
  expect(await page.evaluate(() => (window as unknown as { shifts: string[] }).shifts)).toEqual([]);
});
