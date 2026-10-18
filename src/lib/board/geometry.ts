// From Coachboard, src/lib/board/geometry.ts at commit 4ceafd4 (15 October 2026), unchanged.
// Court lines and arrow shapes as SVG path data, in decimetres (see format.ts).

import type { Arrow, Pt } from "./format";

/** Goal posts: a 3 m goal centred on the 20 m goal line. */
export const POST_LEFT = 85;
export const POST_RIGHT = 115;
export const PLAYER_R = 9;
export const BALL_R = 4.5;
/** Invisible touch area round a piece: ≥ 44 px on a 375 px phone. */
export const HIT_R = 13;

type XY = [number, number];

const round = (v: number) => Math.round(v * 10) / 10;
const fmt = ([x, y]: XY) => `${round(x)} ${round(y)}`;
const lerp = (a: XY, b: XY, t: number): XY => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a: XY, b: XY) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * The goal-area line at `r` dm from the goal at `goalY` (0 or 400): a
 * quarter circle round each post joined by a straight line. 6 m is the goal
 * area, 9 m the (dashed) free-throw line; clip it to the court.
 */
export function areaPath(r: number, goalY: number): string {
  const dir = goalY === 0 ? 1 : -1;
  const sweep = goalY === 0 ? 0 : 1;
  const y = goalY + dir * r;
  return (
    `M ${POST_LEFT - r} ${goalY} A ${r} ${r} 0 0 ${sweep} ${POST_LEFT} ${y} ` +
    `L ${POST_RIGHT} ${y} A ${r} ${r} 0 0 ${sweep} ${POST_RIGHT + r} ${goalY}`
  );
}

/** Quadratic Bézier control point so the curve passes through `mid` at t = 0.5. */
export function controlPoint(a: Pt, mid: Pt, b: Pt): XY {
  return [2 * mid[0] - (a[0] + b[0]) / 2, 2 * mid[1] - (a[1] + b[1]) / 2];
}

/** Start, control and end of the arrow as a quadratic curve. */
function curve(arrow: Arrow): [XY, XY, XY] {
  const a = arrow.pts[0]!;
  const b = arrow.pts[arrow.pts.length - 1]!;
  const c = arrow.pts.length === 3 ? controlPoint(a, arrow.pts[1]!, b) : lerp(a, b, 0.5);
  return [a, c, b];
}

function at([a, c, b]: [XY, XY, XY], t: number): XY {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
}

/** The part of the curve from t = 0 to t (de Casteljau). */
function head(q: [XY, XY, XY], t: number): [XY, XY, XY] {
  return [q[0], lerp(q[0], q[1], t), at(q, t)];
}

/** The point at `t` (0 to 1) along an arrow's curve: where a player or ball is that far along it. */
export function pointAt(arrow: Arrow, t: number): XY {
  return at(curve(arrow), t);
}

/** Where the middle handle sits: the bend point, or halfway along a straight arrow. */
export function arrowMid(arrow: Arrow): XY {
  return arrow.pts.length === 3 ? [...arrow.pts[1]!] : lerp(arrow.pts[0]!, arrow.pts[1]!, 0.5);
}

/** The arrow's curve, stopped `trimEnd` short of its end point. */
function trimmed(arrow: Arrow, trimEnd: number): [XY, XY, XY] {
  let q = curve(arrow);
  if (trimEnd > 0) {
    let t = 1;
    while (t > 0.3 && dist(at(q, t), q[2]) < trimEnd) t -= 0.01;
    if (t > 0.3) q = head(q, t);
  }
  return q;
}

/**
 * SVG path data for an arrow. `trimEnd` stops it short of its end point, so
 * the arrowhead isn't hidden under the player it points at.
 */
export function arrowPath(arrow: Arrow, trimEnd = 0): string {
  const q = trimmed(arrow, trimEnd);
  if (arrow.kind === "dribble") return wave(q);
  if (arrow.pts.length === 2) return `M ${fmt(q[0])} L ${fmt(q[2])}`;
  return `M ${fmt(q[0])} Q ${fmt(q[1])} ${fmt(q[2])}`;
}

/** The bar across the end of a block, where the blocker stands. */
export function blockBar(arrow: Arrow, trimEnd = 0): string {
  const [, c, [x, y]] = trimmed(arrow, trimEnd);
  const d = dist(c, [x, y]) || 1;
  const [nx, ny] = [((c[1] - y) / d) * 4, ((x - c[0]) / d) * 4];
  return `M ${fmt([x + nx, y + ny])} L ${fmt([x - nx, y - ny])}`;
}

/** Where a bounce pass touches the floor: two thirds of the way. */
export function bouncePoint(arrow: Arrow): XY {
  return at(curve(arrow), 2 / 3);
}

/** A sine wave along the curve that flattens out at both ends. */
function wave(q: [XY, XY, XY]): string {
  const amplitude = 3.5;
  const wavelength = 14;
  const samples = 200;

  const pts: XY[] = [];
  const along: number[] = [];
  let length = 0;
  for (let i = 0; i <= samples; i++) {
    const p = at(q, i / samples);
    if (i > 0) length += dist(pts[i - 1]!, p);
    pts.push(p);
    along.push(length);
  }

  const step = 1.5;
  const out: XY[] = [];
  let j = 0;
  for (let s = 0; s <= length; s += step) {
    while (j < samples - 1 && along[j + 1]! < s) j++;
    const p = pts[j]!;
    const next = pts[j + 1]!;
    const segment = dist(p, next) || 1;
    const t = (s - along[j]!) / segment;
    const [x, y] = lerp(p, next, Math.min(1, Math.max(0, t)));
    const nx = -(next[1] - p[1]) / segment;
    const ny = (next[0] - p[0]) / segment;
    const taper = Math.min(1, s / wavelength, (length - s) / wavelength);
    const offset = amplitude * taper * Math.sin((2 * Math.PI * s) / wavelength);
    out.push([x + nx * offset, y + ny * offset]);
  }
  out.push(q[2]);
  return `M ${out.map(fmt).join(" L ")}`;
}
