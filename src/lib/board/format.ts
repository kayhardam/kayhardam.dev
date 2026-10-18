// From Coachboard, src/lib/board/format.ts at commit 4ceafd4 (15 October 2026), unchanged.
// The board's data model and its share-link format.
//
// Coordinates are whole decimetres on a portrait court with the goal at the
// top: x runs 0–200 from sideline to sideline, y runs 0–400 from the goal
// line. A half court shows y 0–200.
//
// A link is "<version>.<payload>". Every version must stay readable forever:
// links end up in QR codes and team chats. The links in ./fixtures/ are
// decoded by the tests and must never be edited. A new format gets a new
// version prefix and its own reader in decode(). Version 1 links are read
// into this version's board (see toBoard()); encode() writes version 2.

export type Pt = [x: number, y: number];

export interface Player {
  /** Attack, defence, or a passer (aanspeelpunt), who has no label. */
  team: "a" | "d" | "p";
  /** Up to 3 characters, e.g. "GK", "LB", "7". */
  label?: string;
  at: Pt;
}

export type ArrowKind = "run" | "pass" | "dribble" | "block" | "shot" | "bounce";

/**
 * Two points draw a straight arrow; three bend it through the middle one.
 * `from` is the player the arrow belongs to: it starts where that player is
 * by then in the step (see settle()), and the link keeps the player instead
 * of the start point. An arrow without a player keeps its own start. A
 * bounce is a pass that touches the floor; the board draws where. A shot
 * always has a player and ends in the goal, on the left, in the middle or
 * on the right (the link keeps only that side).
 */
export interface Arrow {
  kind: ArrowKind;
  from?: number;
  pts: Pt[];
}

/** One step. Every step has the same players (one lineup), each where they stand at its start. */
export interface Frame {
  players: Player[];
  balls: Pt[];
  arrows: Arrow[];
  /** One sentence that explains the step. */
  text?: string;
}

/** A board: one or more steps (`frames`), with one lineup for all of them. The editor edits one step at a time. */
export interface Board {
  v: 2;
  court: "half" | "full";
  title?: string;
  /** Cones belong to the board, not to a step. */
  cones: Pt[];
  frames: Frame[];
}

/** A board as version 1 kept it: in links that start with "1." and in older saved boards. */
export interface BoardV1 {
  v: 1;
  court: "half" | "full";
  frames: {
    players: { team: "a" | "d"; label?: string; at: Pt }[];
    ball?: Pt;
    arrows: { kind: "run" | "pass" | "dribble"; pts: Pt[] }[];
  }[];
}

export const COURT_WIDTH = 200;
export const COURT_LENGTH = 400;

export const MAX_PLAYERS = 30;
export const MAX_ARROWS = 30;
/**
 * The link limits (decision 3, final after the scan test): see docs/metingen.md, phase 11.
 * A limit can grow later; a tighter one breaks shared boards.
 */
export const MAX_STEPS = 8;
export const MAX_TEXT = 100;
export const MAX_TITLE = 40;
export const MAX_BALLS = 4;
export const MAX_CONES = 16;
const MAX_LABEL = 3;
// Characters of base64url. Up to phase 14 it was 4000, enough for one step;
// the largest board within the limits above, eight steps of noise, is about
// 8000 (format.test.ts). Reading more never breaks an older link.
const MAX_PAYLOAD = 10_000;
const MAX_JSON = 64 * 1024; // bytes after inflating

/** Arrows that take their player along: the next arrow of that player starts at their end. */
export const MOVES: readonly ArrowKind[] = ["run", "dribble", "block"];
/** Where a shot ends: x on the goal line, on the left, in the middle or on the right. */
const GOAL_SPOTS = [90, 100, 110];

// ===== Arrows that belong to a player =====

/**
 * Puts each arrow of a player where that player is by then in its step: where
 * they stand, or where their last run, dribble or block in that step ended,
 * in drawing order. A shot ends in the goal nearest the shooter, at the spot
 * nearest its end. Changes the board in place and returns it.
 */
export function settle(board: Board): Board {
  for (const f of board.frames) {
    const at = f.players.map((p) => p.at);
    for (const a of f.arrows) {
      if (a.from === undefined) continue;
      const start: Pt = [...at[a.from]!];
      a.pts[0] = start;
      if (a.kind === "shot") {
        const x = a.pts[1]![0];
        a.pts[1] = [x < 95 ? 90 : x > 105 ? 110 : 100, start[1] > COURT_LENGTH / 2 ? COURT_LENGTH : 0];
      } else if (MOVES.includes(a.kind)) at[a.from] = a.pts.at(-1)!;
    }
  }
  return board;
}

// ===== Validation =====

const isCoord = (n: unknown, max: number) =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max;

const isPt = (p: unknown): p is Pt =>
  Array.isArray(p) &&
  p.length === 2 &&
  isCoord(p[0], COURT_WIDTH) &&
  isCoord(p[1], COURT_LENGTH);

const isList = (x: unknown, max: number): x is unknown[] =>
  Array.isArray(x) && x.length <= max;

/** A title or a sentence: absent, or one line of 1 to `max` characters. */
const isText = (t: unknown, max: number) =>
  t === undefined ||
  (typeof t === "string" && t.length >= 1 && t.length <= max && !/[\0-\x1f\x7f]/.test(t));

function isPlayer(x: unknown): x is Player {
  const p = x as Player;
  return (
    typeof p === "object" &&
    p !== null &&
    TEAMS.includes(p.team) &&
    isPt(p.at) &&
    (p.label === undefined ||
      (p.team !== "p" &&
        typeof p.label === "string" &&
        p.label.length >= 1 &&
        p.label.length <= MAX_LABEL))
  );
}

function isArrow(x: unknown, players: number): x is Arrow {
  const a = x as Arrow;
  return (
    typeof a === "object" &&
    a !== null &&
    KINDS.includes(a.kind) &&
    (a.from === undefined ? a.kind !== "shot" : Number.isInteger(a.from) && a.from >= 0 && a.from < players) &&
    Array.isArray(a.pts) &&
    (a.pts.length === 2 || (a.pts.length === 3 && a.kind !== "shot")) &&
    a.pts.every(isPt)
  );
}

/** A step with the same players as `lineup`: as many, in the same order, with the same team and label. */
function isFrame(x: unknown, lineup: Player[]): x is Frame {
  const f = x as Frame;
  return (
    typeof f === "object" &&
    f !== null &&
    isList(f.players, MAX_PLAYERS) &&
    f.players.length === lineup.length &&
    f.players.every((p, i) => isPlayer(p) && p.team === lineup[i]!.team && p.label === lineup[i]!.label) &&
    isList(f.balls, MAX_BALLS) &&
    f.balls.every(isPt) &&
    isList(f.arrows, MAX_ARROWS) &&
    f.arrows.every((a) => isArrow(a, f.players.length)) &&
    isText(f.text, MAX_TEXT)
  );
}

/**
 * Hand-written so the board's client bundle doesn't need Zod. A board also
 * has to be settled (see settle()), so it draws exactly as its link does.
 */
export function isBoard(x: unknown): x is Board {
  const b = x as Board;
  return (
    typeof b === "object" &&
    b !== null &&
    b.v === 2 &&
    (b.court === "half" || b.court === "full") &&
    isText(b.title, MAX_TITLE) &&
    isList(b.cones, MAX_CONES) &&
    b.cones.every(isPt) &&
    isList(b.frames, MAX_STEPS) &&
    b.frames.length >= 1 &&
    b.frames.every((f) => isFrame(f, (b.frames[0] as Frame | null)?.players ?? [])) &&
    JSON.stringify(settle(structuredClone(b))) === JSON.stringify(b)
  );
}

/**
 * This version's board for a board of this or an earlier version, such as a
 * board saved before version 2; null if it isn't a valid one. A version 1
 * board keeps its drawing: its arrows have no player. One with other players
 * in a later step, or with more steps than MAX_STEPS, isn't valid.
 */
export function toBoard(x: unknown): Board | null {
  try {
    const old = x as BoardV1;
    const board =
      old?.v === 1
        ? {
            v: 2,
            court: old.court,
            cones: [],
            frames: old.frames.map(({ ball, ...f }) => ({ ...f, balls: ball ? [ball] : [] })),
          }
        : x;
    return isBoard(board) ? board : null;
  } catch {
    return null;
  }
}

// ===== Version 1: compact arrays =====
//
//   [court, [frame, …]]                 court: 0 = half, 1 = full
//   frame  = [players, ball, arrows]
//   player = [team, x, y] | [team, x, y, label]   team: 0 = attack, 1 = defence
//   ball   = [x, y] | 0
//   arrow  = [kind, x1, y1, x2, y2(, x3, y3)]     kind: 0 = run, 1 = pass, 2 = dribble

// Version 2 adds teams and kinds at the end of these lists; version 1 reads
// only its own (the first two teams, the first three kinds).
const KINDS: readonly ArrowKind[] = ["run", "pass", "dribble", "block", "shot", "bounce"];
const TEAMS: readonly Player["team"][] = ["a", "d", "p"];
const COURTS = ["half", "full"] as const;

/** list[i] for a number i only: JSON "0" must not read as index 0. */
const pick = <T>(list: readonly T[], i: unknown): T | undefined =>
  typeof i === "number" ? list[i] : undefined;

/** Throws on a wrong shape; the result still has to pass toBoard(). */
function fromV1(data: unknown): unknown {
  const [court, frames] = data as [unknown, unknown[][]];
  return {
    v: 1,
    court: pick(COURTS, court),
    frames: frames.map(([players, ball, arrows]) => {
      const frame: BoardV1["frames"][number] = {
        players: (players as unknown[][]).map(([team, x, y, label]) => {
          const p = { team: pick(TEAMS.slice(0, 2), team), at: [x, y] } as Player;
          if (label !== undefined) p.label = label as string;
          return p;
        }) as BoardV1["frames"][number]["players"],
        arrows: (arrows as number[][]).map(([kind, ...xy]) => ({
          kind: pick(KINDS.slice(0, 3), kind)!,
          pts: pairs(xy),
        })) as BoardV1["frames"][number]["arrows"],
      };
      if (ball !== 0) frame.ball = ball as unknown as Pt;
      return frame;
    }),
  };
}

/** [x1, y1, x2, y2, …] as points; an odd count leaves a broken last point. */
const pairs = (xy: number[]): Pt[] =>
  Array.from({ length: Math.ceil(xy.length / 2) }, (_, i) => [xy[2 * i]!, xy[2 * i + 1]!]);

// ===== Version 2: compact arrays =====
//
//   [court, title, lineup, cones, steps]   court: 0 = half, 1 = full; title: "" = none
//   lineup = [[team] | [team, label], …]   team: 0 = attack, 1 = defence, 2 = passer
//   cones  = [x, y, x, y, …]
//   step   = [positions, balls, arrows, text]   text: "" = none
//   positions = [x, y, x, y, …]           one pair per player, in lineup order
//   balls  = [x, y, x, y, …]
//   arrow  = [kind, player, (bx, by,) x, y]           of a player: even length
//          | [kind, x1, y1, (bx, by,) x, y]           without a player: odd length
//          | [4, player, side]                        a shot: side 0 = left, 1 = middle, 2 = right
//   kind: 0 = run, 1 = pass, 2 = dribble, 3 = block, 4 = shot, 5 = bounce
//
// Reserved: a -1 in place of a position's pair could later mark a player who
// is off the court in that step. Version 2 refuses it for now.

function toV2(board: Board): unknown {
  return [
    COURTS.indexOf(board.court),
    board.title ?? "",
    board.frames[0]!.players.map((p) => {
      const row: (number | string)[] = [TEAMS.indexOf(p.team)];
      if (p.label !== undefined) row.push(p.label);
      return row;
    }),
    board.cones.flat(),
    board.frames.map((f) => [
      f.players.flatMap((p) => p.at),
      f.balls.flat(),
      f.arrows.map((a) => {
        const kind = KINDS.indexOf(a.kind);
        if (a.kind === "shot") return [kind, a.from, GOAL_SPOTS.indexOf(a.pts[1]![0])];
        return a.from === undefined ? [kind, ...a.pts.flat()] : [kind, a.from, ...a.pts.slice(1).flat()];
      }),
      f.text ?? "",
    ]),
  ];
}

/** Throws on a wrong shape; the result still has to pass toBoard(). */
function fromV2(data: unknown): unknown {
  const [court, title, lineup, cones, steps] = data as [unknown, unknown, unknown[][], number[], unknown[][]];
  const board: Board = {
    v: 2,
    court: pick(COURTS, court)!,
    cones: pairs(cones),
    frames: steps.map(([at, balls, arrows, text]) => {
      const xy = at as number[];
      if (xy.length !== 2 * lineup.length) throw new Error("positions");
      const frame: Frame = {
        players: lineup.map(([team, label], i) => {
          const p = { team: pick(TEAMS, team), at: [xy[2 * i], xy[2 * i + 1]] } as Player;
          if (label !== undefined) p.label = label as string;
          return p;
        }),
        balls: pairs(balls as number[]),
        arrows: (arrows as number[][]).map(([kind, ...rest]) => {
          const a = { kind: pick(KINDS, kind)! } as Arrow;
          if (a.kind === "shot") {
            const x = pick(GOAL_SPOTS, rest[1]);
            if (rest.length !== 2 || x === undefined) throw new Error("shot");
            a.from = rest[0];
            a.pts = [[0, 0], [x, 0]];
          } else if (rest.length % 2 === 0) {
            a.pts = pairs(rest);
          } else {
            a.from = rest[0];
            a.pts = [[0, 0], ...pairs(rest.slice(1))];
          }
          return a;
        }),
      };
      if (text !== "") frame.text = text as string;
      return frame;
    }),
  };
  if (title !== "") board.title = title as string;
  // Puts the arrows of a player on their player; toBoard() then checks the rest.
  return board.frames.every((f) => f.arrows.every((a) => a.from === undefined || f.players[a.from])) ? settle(board) : null;
}

// ===== Bytes =====

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[\w-]+$/.test(text)) return null;
  const bin = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Null when the data is corrupt or inflates past `max` bytes. */
async function inflate(bytes: Uint8Array<ArrayBuffer>, max: number): Promise<string | null> {
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  return chunks.map((c) => decoder.decode(c, { stream: true })).join("") + decoder.decode();
}

// ===== Links =====

/** The newest version this code reads, and the one encode() writes. */
const LATEST = 2;

/** Works in the browser and in Node 22, so the build can write links too. */
export async function encode(board: Board): Promise<string> {
  return `${LATEST}.${toBase64Url(await deflate(JSON.stringify(toV2(board))))}`;
}

/**
 * True when two boards draw the same: compared in the shape a link holds
 * before compression, which another browser may compress to other bytes.
 */
export function sameBoard(a: Board, b: Board): boolean {
  return JSON.stringify(toV2(a)) === JSON.stringify(toV2(b));
}

/**
 * True for a link from a newer version of the board than this code, which a
 * tab opened before a deploy can still be running. False for a broken link of
 * a version this code knows.
 */
export function isNewerLink(link: string): boolean {
  const dot = link.indexOf(".");
  const version = link.slice(0, dot);
  return dot > 0 && /^[1-9]\d*$/.test(version) && Number(version) > LATEST;
}

/** The board in a link, or null for anything that isn't a valid one. */
export async function decode(link: string): Promise<Board | null> {
  try {
    const dot = link.indexOf(".");
    const payload = link.slice(dot + 1);
    const version = link.slice(0, dot);
    const read = version === "1" ? fromV1 : version === "2" ? fromV2 : null;
    if (dot < 1 || payload.length > MAX_PAYLOAD || !read) return null;
    const bytes = fromBase64Url(payload);
    const json = bytes && (await inflate(bytes, MAX_JSON));
    return json ? toBoard(read(JSON.parse(json))) : null;
  } catch {
    return null;
  }
}
