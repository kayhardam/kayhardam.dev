import { describe, expect, it } from "vitest";
import { LINEUP } from "../lib/opening/scene";
import { boardFrom } from "./boards";
import { drawing, tacticPages, tactics } from "./opening";

// The landing page's attack (Kay, 25 November 2026): "Kruising MO–LO" from Coachboard's library,
// as a share link per language, and the drawing at the end of the opening.

/** The library's four steps (Coachboard, src/content/library/nl/crossing-cb-lb.md), word for word. */
const library = [
  "MO loopt schuin naar links en krijgt de bal van RO. CL loopt naar rechts naar de 6 meter.",
  "LO kruist achter MO langs.",
  "MO speelt de bal terug naar LO.",
  "LO loopt door en schiet op doel.",
];

describe("the attack", () => {
  it("is the library's in Dutch: its title, its four steps word for word, its labels", async () => {
    const board = await boardFrom(tactics.nl);
    expect(board.title).toBe("Kruising MO–LO");
    expect(board.frames.map((f) => f.text)).toEqual(library);
    expect(board.frames[0]!.players.slice(0, 7).map((p) => p.label)).toEqual(["LH", "LO", "MO", "RO", "RH", "CL", "K"]);
    expect(tactics.nl).toMatch(/^https:\/\/handballcoachboard\.com\/nl\/board\/#t=2\./);
  });

  it("is the same board in English, with Coachboard's English labels", async () => {
    const [nl, en] = await Promise.all([boardFrom(tactics.nl), boardFrom(tactics.en)]);
    expect(en.title).toBe("Crossing CB–LB");
    expect(en.frames).toHaveLength(4);
    expect(en.frames.every((f) => f.text)).toBe(true);
    expect(en.frames[0]!.players.slice(0, 7).map((p) => p.label)).toEqual(["LW", "LB", "CB", "RB", "RW", "P", "GK"]);
    const strip = (board: typeof nl) => board.frames.map((f) => ({ ...f, text: undefined, players: f.players.map((p) => ({ ...p, label: undefined })) }));
    expect(strip(en)).toEqual(strip(nl));
    expect(tactics.en).toMatch(/^https:\/\/handballcoachboard\.com\/en\/board\/#t=2\./);
  });

  it("starts where the scene's lineup stands", async () => {
    for (const link of Object.values(tactics)) {
      const board = await boardFrom(link);
      expect(board.frames[0]!.players.map((p) => p.at)).toEqual(LINEUP);
    }
  });

  it("has its page in the library in Dutch only", () => {
    expect(tacticPages).toEqual({ nl: "https://handballcoachboard.com/nl/tactics/crossing-cb-lb/" });
  });
});

describe("the drawing at the end", () => {
  it("is the first step with all seven arrows, each from where its player is by then", async () => {
    const board = await boardFrom(tactics.nl);
    const end = drawing(board);
    expect(end.frames).toHaveLength(1);
    const [frame] = end.frames;
    expect(frame!.players).toEqual(board.frames[0]!.players);
    expect(frame!.balls).toEqual(board.frames[0]!.balls);
    expect(frame!.arrows.map((a) => [a.kind, a.from, a.pts])).toEqual([
      ["run", 5, [[100, 66], [124, 88], [138, 76]]],
      ["run", 2, [[100, 130], [66, 94]]],
      ["pass", 3, [[170, 118], [66, 94]]],
      ["run", 1, [[30, 118], [62, 126], [88, 112]]],
      ["pass", 2, [[66, 94], [88, 112]]],
      ["run", 1, [[88, 112], [88, 94]]],
      ["shot", 1, [[88, 94], [110, 0]]],
    ]);
  });

  it("leaves the attack itself as it was", async () => {
    const board = await boardFrom(tactics.nl);
    const before = JSON.stringify(board);
    drawing(board);
    expect(JSON.stringify(board)).toBe(before);
  });
});
