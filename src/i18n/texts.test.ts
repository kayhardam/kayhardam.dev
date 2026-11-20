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

      it("has the places {n} and {count} in the board's counters", () => {
        for (const key of ["board.counter", "board.step"]) {
          const counter = list.find(([k]) => k === key)![1];
          expect(counter).toContain("{n}");
          expect(counter).toContain("{count}");
        }
      });

      // What a search result shows without cutting it off.
      it("has a title of at most 60 characters and a description of at most 160", () => {
        const t = code === "nl" ? nl : en;
        expect(t.title.length).toBeLessThanOrEqual(60);
        expect(t.description.length).toBeLessThanOrEqual(160);
      });

      it("has no arrow: the arrow is an SVG", () => {
        expect(list.filter(([, value]) => value.includes("→"))).toEqual([]);
      });
    });
  }

  it('says "coach" in English, never "trainer"', () => {
    expect(languages.en.filter(([, value]) => /trainer/i.test(value))).toEqual([]);
  });

  // No job titles on the full page until the texts for employers come (Kay, 5 November 2026):
  // the title, the description and the JSON-LD keep them. The holding page says who Kay is
  // again, in the first sentence of his statement (20 November 2026); nothing else says them.
  it("has a job title only in the title, the description, the JSON-LD and the holding page's statement", () => {
    for (const [code, list] of Object.entries(languages)) {
      const allowed = (key: string) => ["title", "description", "jobTitle"].includes(key) || key.startsWith("holding.statement.0.");
      const said = list.filter(([key, value]) => !allowed(key) && /gymleraar|handbaltrainer|PE teacher|handball coach/i.test(value));
      expect(said, code).toEqual([]);
    }
  });

  it("uses the typographic apostrophe in English", () => {
    expect(languages.en.filter(([, value]) => value.includes("'"))).toEqual([]);
  });
});
