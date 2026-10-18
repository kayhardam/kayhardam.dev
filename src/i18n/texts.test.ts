import { describe, expect, it } from "vitest";
import { en } from "./en";
import { nl } from "./nl";

// The rules for the texts from the brief. That the texts are the brief's word
// for word can't be checked here: the brief isn't in the repo.

type Entry = [key: string, value: string];

/** Every text as [key, value], with keys like "about.text.0". */
function entries(value: unknown, key = ""): Entry[] {
  if (typeof value === "string") return [[key, value]];
  return Object.entries(value as object).flatMap(([k, v]) => entries(v, key ? `${key}.${k}` : k));
}

const languages = { nl: entries(nl), en: entries(en) };

describe("texts", () => {
  it("have the same keys in both languages", () => {
    expect(languages.en.map(([key]) => key)).toEqual(languages.nl.map(([key]) => key));
  });

  for (const [code, list] of Object.entries(languages)) {
    describe(code, () => {
      it("has no empty texts", () => {
        expect(list.filter(([, value]) => value.trim() === "")).toEqual([]);
      });

      it('never says "gratis" or "free"', () => {
        expect(list.filter(([, value]) => /\b(gratis|free)\b/i.test(value))).toEqual([]);
      });

      it("has no arrow: the arrow is an SVG", () => {
        expect(list.filter(([, value]) => value.includes("→"))).toEqual([]);
      });
    });
  }

  it('says "coach" in English, never "trainer"', () => {
    expect(languages.en.filter(([, value]) => /trainer/i.test(value))).toEqual([]);
  });

  it("uses the typographic apostrophe in English", () => {
    expect(languages.en.filter(([, value]) => value.includes("'"))).toEqual([]);
  });
});
