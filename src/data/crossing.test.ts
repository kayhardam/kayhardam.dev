import { beforeAll, describe, expect, it } from "vitest";
import { HOLD } from "../components/board/BoardCard.svelte";
import { locales, text, type Locale } from "../i18n";
import type { Board, Frame } from "../lib/board/format";
import { moment } from "../lib/board/play";
import { legendOf, moveFor, moves, stillFor } from "../lib/board/viewer";
import { boardFrom, boards } from "./boards";

// Coachboard's play.ts and viewer.ts on the crossing, the board in the hero.
// Instead of Coachboard's own tests of them, which need its editor and fixtures.

/** How long each step shows still (ms): 60 per character, at least 1.2 s. */
const still: Record<Locale, number[]> = {
  nl: [2220, 1560, 1500, 1200],
  en: [2280, 1260, 1200, 1200],
};

/** One round of playing on the hero (ms): every step still and moving, and the hold after the shot. */
const round: Record<Locale, number> = { nl: 13_080, en: 12_540 };

const places = (frame: Frame) => ({ players: frame.players.map((p) => p.at), balls: frame.balls });

const decoded = {} as Record<Locale, Board>;
beforeAll(async () => {
  for (const code of locales) decoded[code] = await boardFrom(boards[code]);
});

for (const code of locales) {
  describe(`the crossing (${code})`, () => {
    it("plays from each step to the start of the next", () => {
      const board = decoded[code];
      for (let s = 0; s < board.frames.length; s++) {
        expect(places(moment(board, s, 0)), `step ${s + 1}`).toEqual(places(board.frames[s]!));
        if (s + 1 < board.frames.length) {
          expect(places(moment(board, s, 1)), `step ${s + 1}`).toEqual(places(board.frames[s + 1]!));
        }
      }
    });

    it("ends with the ball in the goal", () => {
      const board = decoded[code];
      expect(moment(board, board.frames.length - 1, 1).balls).toEqual([[100, 0]]);
    });

    it("halfway through step 1, the centre back is on the run, with the ball", () => {
      const board = decoded[code];
      const start = board.frames[0]!;
      const half = moment(board, 0, 0.5);
      expect(half.players[2]!.at).toEqual([87.5, 112.5]);
      // The ball stays where it was beside the player.
      const beside = (f: Frame) => [f.balls[0]![0] - f.players[2]!.at[0], f.balls[0]![1] - f.players[2]!.at[1]];
      expect(beside(half)).toEqual(beside(start));
    });

    it("shows each step still long enough to read, and moves it in 1 s", () => {
      const board = decoded[code];
      expect(board.frames.map(stillFor)).toEqual(still[code]);
      expect(board.frames.map(moveFor)).toEqual([1000, 1000, 1000, 1000]);
    });

    it("plays a round in the time of the phase 5 plan, with 2.6 s after the shot", () => {
      const board = decoded[code];
      const steps = board.frames.map((f, s) => stillFor(f) + (moves(board, s) ? moveFor(f) : 0));
      expect(HOLD).toBe(2600);
      expect(steps.reduce((a, b) => a + b) + HOLD).toBe(round[code]);
    });

    it("moves from every step", () => {
      const board = decoded[code];
      expect(board.frames.map((_, s) => moves(board, s))).toEqual([true, true, true, true]);
    });

    it("has a run, a pass and a shot in its legend, each with a text in both languages", () => {
      const legend = legendOf(decoded[code]);
      expect(legend).toEqual(["run", "pass", "shot"]);
      for (const language of locales) {
        const kinds: Record<string, string> = text(language).board.kinds;
        for (const kind of legend) expect(kinds[kind], `${kind} (${language})`).toBeTruthy();
      }
    });
  });
}
