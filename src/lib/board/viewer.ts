// From Coachboard, src/lib/board/viewer.ts at commit 4ceafd4 (15 October 2026), unchanged.
// The viewer's choices about a board (phase 15): how long a step shows still
// and moves when it plays (K7), and what the legend lists (K9). Pure, so it is
// tested without a browser.

import type { ArrowKind, Board, Frame } from "./format";
import { moment, turnsIn } from "./play";

/** A step shows still at least this long (ms), as in the editor. */
export const STILL = 1200;
/** Reading time per character of a step's sentence (ms): about 17 characters a second. */
export const READ = 60;
/** The move to the next step takes at least this long (ms), as in the editor. */
export const MOVE = 1000;
/** Each turn of arrows gets this long (ms), so a pass and the run after it can be followed. */
export const TURN = 700;

/** How long `frame` shows still before it moves: long enough to read its sentence. */
export const stillFor = (frame: Frame) => Math.max(STILL, (frame.text?.length ?? 0) * READ);

/** How long the move of `frame` to the next step takes: a share per turn of its arrows. */
export const moveFor = (frame: Frame) => Math.max(MOVE, turnsIn(frame) * TURN);

/** Where the players and balls of `frame` are. */
const places = (frame: Frame) => JSON.stringify([frame.players.map((p) => p.at), frame.balls]);

/**
 * Whether anything moves from step `step` on: a player or ball that ends the
 * move somewhere else than where it starts. When nothing moves, the viewer
 * doesn't wait for it (Kay, 15 October 2026): Next goes on at once, Play gives
 * the step only its time to read, and after a last step that doesn't move
 * there is nothing left to play.
 */
export const moves = (board: Board, step: number) => places(moment(board, step, 1)) !== places(board.frames[step]!);

/** The legend's order: the kinds of arrow as the editor's kind bar lists them. */
const KINDS: readonly ArrowKind[] = ["run", "pass", "bounce", "dribble", "shot", "block"];

export type LegendItem = ArrowKind | "passer" | "cone";

/**
 * What the legend lists for `board`: a passer and a cone if the board has
 * one, then the kinds of arrow it has in any step, in a fixed order.
 */
export function legendOf(board: Board): LegendItem[] {
  const kinds = new Set(board.frames.flatMap((f) => f.arrows.map((a) => a.kind)));
  return [
    ...(board.frames[0]!.players.some((p) => p.team === "p") ? (["passer"] as const) : []),
    ...(board.cones.length ? (["cone"] as const) : []),
    ...KINDS.filter((k) => kinds.has(k)),
  ];
}
