import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { COMMIT, VIEWPORT } from "../../scripts/measure-coachboard.mjs";
import data from "./tap-targets.json";

// The touch targets of Coachboard's editor, measured by scripts/measure-coachboard.mjs
// on Coachboard at 03be23b (Hars, 15 November 2026), for the lens on the home page.
// Measured, never made up: these tests check that the file is the measurement's.

const langs = ["nl", "en"] as const;
type Target = (typeof data.nl.targets)[number] & { size?: number; points?: number[][] };

describe("tap-targets.json", () => {
  it("is measured on Coachboard at 03be23b, in a window of 393 × 659", () => {
    expect(data.source).toMatchObject({ repo: "kayhardam/coachboard", commit: COMMIT, viewport: VIEWPORT });
    expect(COMMIT).toBe("03be23bea71d6bffa37d5af567b88376d3d592cc");
    expect(VIEWPORT).toEqual({ width: 393, height: 659 });
  });

  for (const lang of langs) {
    describe(lang, () => {
      const targets = data[lang].targets as Target[];

      it("has the editor's page, a name for every target, and every target inside the window", () => {
        expect(data[lang].page).toBe(`/${lang}/board/`);
        for (const t of targets) {
          expect(t.name.trim(), JSON.stringify(t)).not.toBe("");
          expect(t.x, t.name).toBeGreaterThanOrEqual(0);
          expect(t.y, t.name).toBeGreaterThanOrEqual(0);
          expect(t.x + t.width, t.name).toBeLessThanOrEqual(VIEWPORT.width + 0.1);
          expect(t.y + t.height, t.name).toBeLessThanOrEqual(VIEWPORT.height + 0.1);
        }
      });

      it("has the default lineup's 13 players and the ball, each with the area a tap reaches it in", () => {
        const areas = targets.filter((t) => t.shape === "area");
        expect(areas.filter((t) => t.kind === "player")).toHaveLength(13);
        expect(areas.filter((t) => t.kind === "ball")).toHaveLength(1);
        for (const t of areas) {
          // HIT_R is 13 dm: 45.4 px here. No area is larger, and its smallest width is at most its box.
          expect(t.width, t.name).toBeLessThanOrEqual(45.5);
          expect(t.height, t.name).toBeLessThanOrEqual(45.5);
          expect(t.size!, t.name).toBeLessThanOrEqual(Math.max(t.width, t.height) + 0.1);
          expect(t.points!.length, t.name).toBeGreaterThanOrEqual(3);
          for (const [x, y] of t.points!) {
            expect(x, t.name).toBeGreaterThanOrEqual(t.x - 0.1);
            expect(x, t.name).toBeLessThanOrEqual(t.x + t.width + 0.1);
            expect(y, t.name).toBeGreaterThanOrEqual(t.y - 0.1);
            expect(y, t.name).toBeLessThanOrEqual(t.y + t.height + 0.1);
          }
        }
      });

      it("has the buttons and links as boxes, none of them smaller than 40 × 44 px", () => {
        const boxes = targets.filter((t) => t.shape === "rect");
        expect(boxes.length).toBeGreaterThan(0);
        for (const t of boxes) {
          expect(["link", "button"]).toContain(t.kind);
          expect(Math.min(t.width, t.height), t.name).toBeGreaterThanOrEqual(40);
        }
      });

      it("has its screenshot: 786 × 1318 (twice the window), a PNG without EXIF or ICC", async () => {
        const meta = await sharp(new URL(`../assets/coachboard-editor-${lang}.png`, import.meta.url).pathname).metadata();
        expect({ width: meta.width, height: meta.height, format: meta.format, exif: meta.exif, icc: meta.icc }).toEqual({
          width: 2 * VIEWPORT.width,
          height: 2 * VIEWPORT.height,
          format: "png",
          exif: undefined,
          icc: undefined,
        });
      });
    });
  }

  it("has the same court in both languages: the same areas in the same places", () => {
    const areas = (lang: (typeof langs)[number]) =>
      (data[lang].targets as Target[]).filter((t) => t.shape === "area").map(({ kind, x, y, width, height, size, points }) => ({ kind, x, y, width, height, size, points }));
    expect(areas("en")).toEqual(areas("nl"));
  });
});
