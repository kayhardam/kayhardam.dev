import { beforeAll, describe, expect, it } from "vitest";
import { locales, type Locale } from "../i18n";
import type { Board, Pt } from "../lib/board/format";
import { BALL_R, PLAYER_R } from "../lib/board/geometry";
import { moment } from "../lib/board/play";
import { boardFrom, boards, legendFor } from "./boards";

// The two share links decode to the board the page shows: the brief's attack,
// within the cropped court, in both languages.

/** From the brief, word for word: the sentence per step and the attack's labels. */
const brief: Record<Locale, { steps: string[]; labels: string[] }> = {
  nl: {
    steps: [
      "MO gaat met de bal schuin naar links.",
      "LO kruist achter MO langs.",
      "MO speelt de bal naar LO.",
      "LO schiet op doel.",
    ],
    labels: ["LH", "LO", "MO", "RO", "RH", "CL", "K"],
  },
  en: {
    steps: [
      "CB goes diagonally left with the ball.",
      "LB crosses behind CB.",
      "CB passes to LB.",
      "LB shoots at goal.",
    ],
    labels: ["LW", "LB", "CB", "RB", "RW", "P", "GK"],
  },
};

/** The court up to 16 metres (brief): viewBox -8 -14 216 174. */
const crop = { left: -8, top: -14, right: -8 + 216, bottom: -14 + 174 };

/** What sticks out of the cropped court: a point with radius `r` past any of the four edges. */
const outside = ([x, y]: Pt, r: number) =>
  x - r < crop.left || x + r > crop.right || y - r < crop.top || y + r > crop.bottom;

const decoded = {} as Record<Locale, Board>;
beforeAll(async () => {
  for (const code of locales) decoded[code] = await boardFrom(boards[code]);
});

describe("boards", () => {
  for (const code of locales) {
    describe(code, () => {
      it("is a Coachboard share link in that language", () => {
        expect(boards[code].startsWith(`https://handballcoachboard.com/${code}/board/#t=2.`)).toBe(true);
      });

      it("decodes to a half court without a title, in four steps", () => {
        const board = decoded[code];
        expect(board.court).toBe("half");
        expect(board.title).toBeUndefined();
        expect(board.frames).toHaveLength(4);
      });

      it("has the brief's sentences, word for word", () => {
        expect(decoded[code].frames.map((f) => f.text)).toEqual(brief[code].steps);
      });

      it("has the brief's labels: the attack and the keeper, the other defenders without one", () => {
        const players = decoded[code].frames[0]!.players;
        expect(players.flatMap((p) => (p.label ? [p.label] : []))).toEqual(brief[code].labels);
        expect(players).toHaveLength(13);
      });

      it("keeps every piece inside the cropped court, in every step and after the last", () => {
        const board = decoded[code];
        const moments = [...board.frames, moment(board, board.frames.length - 1, 1)];
        const out: string[] = [];
        moments.forEach((frame, step) => {
          frame.players.forEach((p, i) => outside(p.at, PLAYER_R) && out.push(`step ${step + 1}, player ${p.label ?? i}`));
          frame.balls.forEach((b, i) => outside(b, BALL_R) && out.push(`step ${step + 1}, ball ${i}`));
          frame.arrows.forEach((a, i) => a.pts.forEach((pt) => outside(pt, 0) && out.push(`step ${step + 1}, arrow ${i}`)));
        });
        expect(out).toEqual([]);
      });

      it("has the legend Coachboard's legendOf() gives, with a text for each item", () => {
        expect(legendFor(decoded[code], code).map((item) => item.text)).toEqual(
          code === "nl" ? ["Loop", "Pass", "Schot"] : ["Run", "Pass", "Shot"],
        );
      });

      it("stops on a legend item without a text", () => {
        const board = structuredClone(decoded[code]);
        board.frames[0]!.arrows[0]!.kind = "dribble";
        expect(() => legendFor(board, code)).toThrow(`No text for the legend item dribble (${code})`);
      });
    });
  }

  it("is the same attack in both languages: the same places and arrows in every step", () => {
    const shape = (board: Board) =>
      board.frames.map((f) => ({ players: f.players.map((p) => [p.team, p.at]), balls: f.balls, arrows: f.arrows }));
    expect(shape(decoded.en)).toEqual(shape(decoded.nl));
  });

  it("stops on a broken link", async () => {
    await expect(boardFrom("https://handballcoachboard.com/nl/board/#t=2.broken")).rejects.toThrow("Not a board");
    await expect(boardFrom("https://handballcoachboard.com/nl/board/")).rejects.toThrow("Not a board");
  });
});
