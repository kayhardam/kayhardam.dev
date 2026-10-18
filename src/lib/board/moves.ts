// From Coachboard, src/lib/board/moves.ts at commit 4ceafd4 (15 October 2026), unchanged.
// Where pieces go in a step: where each player ends, who has a ball and
// where it goes. Pure. Editing (edit.ts) and playing (play.ts) both use it,
// so a page that only plays a board needs none of the editing operations.

import { COURT_WIDTH, MOVES, type Board, type Frame, type Pt } from "./format";

const length = (board: Board) => (board.court === "full" ? 400 : 200);

/** Rounded to whole decimetres and kept on the visible court. */
export function clampPt(board: Board, [x, y]: [number, number]): Pt {
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
  return [clamp(x, COURT_WIDTH), clamp(y, length(board))];
}

export const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

/** Where `player` is after their runs, dribbles and blocks in `frame`: where their next arrow starts. */
export function endOf(frame: Frame, player: number): Pt {
  let at = frame.players[player]!.at;
  for (const a of frame.arrows) if (a.from === player && MOVES.includes(a.kind)) at = a.pts.at(-1)!;
  return [...at];
}

/** Within this many dm of a ball, a player has it at the start of a step: holder() in hit.ts at its least reach. */
const HOLD = 26;
/** Where a received ball lies beside its receiver, as in the default lineup. */
export const BESIDE: Pt = [10, -8];

/**
 * A ball's way through a step: who has it at the start (`has`, with the ball
 * `by` beside them) and the passes, bounces or shots it goes with, by index
 * in the step's arrows, each with who receives it (`to`).
 */
export interface Trip {
  start: Pt;
  has?: number;
  by: Pt;
  passes: { arrow: number; to?: number }[];
}

/**
 * The way of each ball of `frame` through it. A ball goes along with whoever
 * has it (the nearest player within HOLD), and with a pass, bounce or shot of
 * theirs to its end, where whoever stands there by then has it. A player who
 * passes, bounces or shoots without a ball within HOLD takes the nearest ball
 * nobody has: on a full court on a phone, the editor gives a pass from the
 * ball to a player up to twice a tap's reach away (holder() in hit.ts),
 * further than HOLD. A ball nobody has also goes with a pass without a player
 * that starts on it.
 */
export function ballTrips(frame: Frame): Trip[] {
  const at = frame.players.map((p) => p.at);
  /** The player standing on `pt`, or nearest to it within `r`. */
  const near = (pt: Pt, r: number) => {
    let best: number | undefined;
    at.forEach((p, i) => {
      const d = Math.hypot(p[0] - pt[0], p[1] - pt[1]);
      if (d <= r) [best, r] = [i, d];
    });
    return best;
  };
  const balls = frame.balls.map((b) => {
    const has = near(b, HOLD);
    return { at: b, has, trip: { start: b, has, by: has === undefined ? [0, 0] : [b[0] - at[has]![0], b[1] - at[has]![1]], passes: [] } as Trip };
  });
  frame.arrows.forEach((a, arrow) => {
    const end = a.pts.at(-1)!;
    if (MOVES.includes(a.kind)) {
      if (a.from !== undefined) at[a.from] = end;
      return;
    }
    const from = a.from;
    const free = balls.filter((b) => b.has === undefined);
    const dist = (b: { at: Pt }) => Math.hypot(b.at[0] - at[from!]![0], b.at[1] - at[from!]![1]);
    const ball =
      from === undefined
        ? free.find((b) => same(b.at, a.pts[0]!))
        : (balls.find((b) => b.has === from) ?? free.sort((p, q) => dist(p) - dist(q))[0]);
    if (!ball) return;
    ball.at = end;
    ball.has = near(end, 0);
    ball.trip.passes.push({ arrow, to: ball.has });
  });
  return balls.map((b) => b.trip);
}

/**
 * Where each ball of `frame` (a step of `board`) is at its end (ballTrips()):
 * beside whoever has it, or where it went if nobody has it.
 */
export function ballsAfter(board: Board, frame: Frame): Pt[] {
  return ballTrips(frame).map(({ start, has, by, passes }) => {
    const last = passes.at(-1);
    const owner = last ? last.to : has;
    const [x, y] = owner === undefined ? (last ? frame.arrows[last.arrow]!.pts.at(-1)! : start) : endOf(frame, owner);
    const [dx, dy] = owner === undefined ? [0, 0] : last ? BESIDE : by;
    return clampPt(board, [x + dx, y + dy]);
  });
}
