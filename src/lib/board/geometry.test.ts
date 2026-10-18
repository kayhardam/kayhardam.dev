// From Coachboard, src/lib/board/geometry.test.ts at commit 4ceafd4 (15 October 2026), unchanged.
import { describe, expect, it } from "vitest";
import type { Arrow } from "./format";
import { areaPath, arrowMid, arrowPath, controlPoint } from "./geometry";

/** All coordinate pairs in path data, in order. */
const points = (d: string) =>
  [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

describe("areaPath", () => {
  it("draws the 6 m line round the top goal's posts", () => {
    expect(areaPath(60, 0)).toBe("M 25 0 A 60 60 0 0 0 85 60 L 115 60 A 60 60 0 0 0 175 0");
  });

  it("mirrors it for the bottom goal", () => {
    expect(areaPath(60, 400)).toBe(
      "M 25 400 A 60 60 0 0 1 85 340 L 115 340 A 60 60 0 0 1 175 400",
    );
  });
});

describe("arrowPath", () => {
  const straight: Arrow = { kind: "run", pts: [[10, 10], [50, 10]] };
  const bent: Arrow = { kind: "run", pts: [[0, 0], [50, 40], [100, 0]] };

  it("draws two points as a line", () => {
    expect(arrowPath(straight)).toBe("M 10 10 L 50 10");
  });

  it("bends three points through the middle one", () => {
    const [cx, cy] = controlPoint([0, 0], [50, 40], [100, 0]);
    expect(arrowPath(bent)).toBe(`M 0 0 Q ${cx} ${cy} 100 0`);
    // A quadratic curve's midpoint is (a + 2c + b) / 4.
    expect([(0 + 2 * cx + 100) / 4, (0 + 2 * cy + 0) / 4]).toEqual([50, 40]);
  });

  it("stops short of the end by trimEnd", () => {
    const [, end] = points(arrowPath(straight, 10));
    expect(end![0]).toBeCloseTo(40, 0);
    expect(end![1]).toBe(10);
  });

  it("keeps the whole arrow when trimming would eat most of it", () => {
    expect(arrowPath({ kind: "run", pts: [[0, 0], [10, 0]] }, 20)).toBe("M 0 0 L 10 0");
  });

  it("waves a dribble between its start and end", () => {
    const pts = points(arrowPath({ ...straight, kind: "dribble" }));
    expect(pts[0]).toEqual([10, 10]);
    expect(pts.at(-1)).toEqual([50, 10]);
    expect(pts.length).toBeGreaterThan(20);
    expect(Math.max(...pts.map(([, y]) => Math.abs(y! - 10)))).toBeGreaterThan(2);
  });
});

describe("arrowMid", () => {
  it("is halfway along a straight arrow", () => {
    expect(arrowMid({ kind: "pass", pts: [[10, 10], [50, 30]] })).toEqual([30, 20]);
  });

  it("is the bend point of a curved arrow", () => {
    expect(arrowMid({ kind: "pass", pts: [[10, 10], [20, 40], [50, 30]] })).toEqual([20, 40]);
  });
});
