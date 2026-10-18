// From Coachboard, src/lib/board/play.ts at commit 4ceafd4 (15 October 2026), unchanged.
// Afspelen (decision D4, phase 14-3): where the pieces are between one step
// and the next, as they move along their arrows. Pure, so it is tested
// without a browser. A moment is only to watch: its places aren't whole
// decimetres, so the editor keeps it out of the board, like a drawing arrow,
// and it never reaches a link, My boards or Undo.

import { ballsAfter, ballTrips, BESIDE, endOf } from "./moves";
import { MOVES, type Board, type Frame, type Pt } from "./format";
import { pointAt } from "./geometry";

const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];
/** `a` moved by `k` times `d`. */
const shift = (a: Pt, d: Pt, k = 1): Pt => [a[0] + d[0] * k, a[1] + d[1] * k];
const lerp = (a: Pt, b: Pt, t: number) => shift(a, [b[0] - a[0], b[1] - a[1]], t);

/**
 * When each arrow of `frame` happens, in turns of equal length: [start, end].
 * A player's arrows go one after another, in drawing order; a pass, bounce or
 * shot waits for its ball, and whoever receives a pass waits for it before
 * their next arrow. Who needn't wait starts at once.
 */
function turns(frame: Frame): [number, number][] {
  const free = frame.players.map(() => 0);
  const trips = ballTrips(frame);
  const ready = trips.map(() => 0);
  return frame.arrows.map((a, j) => {
    // The ball a pass, bounce or shot takes, if any.
    const b = trips.findIndex(({ passes }) => passes.some((p) => p.arrow === j));
    const end = Math.max(free[a.from!] ?? 0, ready[b] ?? 0) + 1;
    if (a.from !== undefined) free[a.from] = end;
    if (b >= 0) {
      ready[b] = end;
      const to = trips[b]!.passes.find((p) => p.arrow === j)!.to;
      if (to !== undefined) free[to] = Math.max(free[to]!, end);
    }
    return [end - 1, end];
  });
}

/** How many turns the arrows of `frame` take (turns()): at least one, also without arrows. */
export const turnsIn = (frame: Frame) => Math.max(1, ...turns(frame).map(([, end]) => end));

/**
 * Step `step` at `t` (0 to 1) of the way to the next step: at 0 exactly the
 * step, at 1 exactly where the next one starts (after the last step: where
 * its arrows take everyone). The arrows happen in turns (turns()), which share
 * the time: along a run, dribble or screen a player moves; during a pass,
 * bounce or shot they stand, and the ball goes along it from where it lay. A
 * ball goes with whoever has it, and lies beside its receiver after a pass. A
 * player or ball that the next step has somewhere else (moved there by hand)
 * goes in a straight line.
 */
export function moment(board: Board, step: number, t: number): Frame {
  const frame = board.frames[step]!;
  const next = board.frames[step + 1];
  const after = ballsAfter(board, frame);
  const ends = frame.players.map((_, i) => next?.players[i]!.at ?? endOf(frame, i));
  const balls = next?.balls ?? after;
  if (t >= 1) return { ...frame, players: frame.players.map((p, i) => ({ ...p, at: ends[i]! })), balls };
  const when = turns(frame);
  const now = t * Math.max(1, ...when.map(([, e]) => e));
  /** How far along arrow `j` is, from 0 to 1. */
  const along = (j: number) => Math.min(1, Math.max(0, now - when[j]![0]));
  const place = (i: number): Pt => {
    let at = frame.players[i]!.at;
    if (!same(endOf(frame, i), ends[i]!)) return lerp(at, ends[i]!, t);
    frame.arrows.forEach((a, j) => {
      if (a.from === i && MOVES.includes(a.kind) && along(j) > 0) at = pointAt(a, along(j));
    });
    return at;
  };
  return {
    ...frame,
    players: frame.players.map((p, i) => ({ ...p, at: place(i) })),
    balls: ballTrips(frame).map(({ start, has, by, passes }, b) => {
      const target = balls[b] ?? start;
      if (!same(after[b]!, target)) return lerp(start, target, t);
      let at = has === undefined ? start : shift(place(has), by);
      for (const { arrow, to } of passes) {
        const a = frame.arrows[arrow]!;
        const k = along(arrow);
        if (!k) break;
        // On its way it starts where it lay (beside the passer) and ends on the arrow's end.
        at = k < 1 ? shift(pointAt(a, k), [at[0] - a.pts[0]![0], at[1] - a.pts[0]![1]], 1 - k) : to === undefined ? a.pts.at(-1)! : shift(place(to), BESIDE);
      }
      return at;
    }),
  };
}
