// From Coachboard, src/lib/board/moves.test.ts at commit 4ceafd4 (15 October 2026), unchanged.
import { describe, expect, it } from "vitest";
import type { Board } from "./format";
import { clampPt } from "./moves";

const empty: Board = { v: 2, court: "half", cones: [], frames: [{ players: [], balls: [], arrows: [] }] };

describe("clampPt", () => {
  it("rounds to whole decimetres and keeps points on the visible court", () => {
    expect(clampPt(empty, [10.4, 20.6])).toEqual([10, 21]);
    expect(clampPt(empty, [-5, 250])).toEqual([0, 200]);
    expect(clampPt({ ...empty, court: "full" }, [250, 250])).toEqual([200, 250]);
  });
});
