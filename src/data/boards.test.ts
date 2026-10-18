import { describe, expect, it } from "vitest";
import { locales } from "../i18n";
import { boards } from "./boards";

// Phase 4 adds the full check: decode() gives the board the page shows.
describe("boards", () => {
  for (const code of locales) {
    it(`${code}: is a Coachboard share link in that language`, () => {
      expect(boards[code].startsWith(`https://handballcoachboard.com/${code}/board/#t=2.`)).toBe(true);
    });
  }
});
