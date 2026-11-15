import { beforeAll, describe, expect, it } from "vitest";
import { locales, type Locale } from "../i18n";
import { encode, type Board, type Pt } from "../lib/board/format";
import { BALL_R, PLAYER_R } from "../lib/board/geometry";
import { moment } from "../lib/board/play";
import { boardFrom, boards, stepsFor } from "./boards";

// The two share links decode to the board the page shows: the same attack,
// within the cropped court, in both languages.

/**
 * Word for word: the title, the sentence per step and the attack's labels. Dutch:
 * Kay's attack for Hars (15 November 2026). English: the brief's, until Kay makes
 * the English link of that attack.
 */
const brief: Record<Locale, { title: string; steps: string[]; labels: string[] }> = {
  nl: {
    title: "Kruising AI–IK",
    steps: ["AI verkent.", "Ik kies.", "AI bouwt.", "Ik controleer."],
    labels: ["LH", "IK", "AI", "RO", "RH", "CL", "K"],
  },
  en: {
    title: "Crossing CB–LB",
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

      it("decodes to a half court with the brief's title, in four steps", () => {
        const board = decoded[code];
        expect(board.court).toBe("half");
        expect(board.title).toBe(brief[code].title);
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

      // Kay: "loop, loop, pass, schot", with where each arrow starts and ends, in metres.
      it("has a step line per step: the arrow's kind, from where to where", () => {
        const [run, pass, shot] = code === "nl" ? ["Loop", "Pass", "Schot"] : ["Run", "Pass", "Shot"];
        const m = code === "nl" ? (x: string, y: string) => `[${x}; ${y}]` : (x: string, y: string) => `[${x.replace(",", ".")}, ${y.replace(",", ".")}]`;
        expect(stepsFor(decoded[code], code)).toEqual([
          { kind: run, from: m("10,0", "13,0"), to: m("7,5", "9,5") },
          { kind: run, from: m("3,0", "11,8"), to: m("11,5", "10,5") },
          { kind: pass, from: m("7,5", "9,5"), to: m("11,5", "10,5") },
          { kind: shot, from: m("11,5", "10,5"), to: m("10,0", "0,0") },
        ]);
      });

      it("stops on a kind without a text, and on a step without exactly one arrow", () => {
        const dribble = structuredClone(decoded[code]);
        dribble.frames[0]!.arrows[0]!.kind = "dribble";
        expect(() => stepsFor(dribble, code)).toThrow(`No text for the kind dribble (${code})`);
        const two = structuredClone(decoded[code]);
        two.frames[1]!.arrows.push(two.frames[1]!.arrows[0]!);
        expect(() => stepsFor(two, code)).toThrow("Step 2 has 2 arrows, not 1");
        const none = structuredClone(decoded[code]);
        none.frames[2]!.arrows = [];
        expect(() => stepsFor(none, code)).toThrow("Step 3 has 0 arrows, not 1");
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

  // The title is the label above the court: without one there is nothing to show there.
  it("stops on a link without a title", async () => {
    const untitled = structuredClone(decoded.nl);
    delete untitled.title;
    const link = `https://handballcoachboard.com/nl/board/#t=${await encode(untitled)}`;
    await expect(boardFrom(link)).rejects.toThrow(`No title: ${link}`);
  });
});
