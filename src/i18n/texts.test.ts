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

      it("has the places {n} and {count} in the board's counter", () => {
        const step = list.find(([key]) => key === "board.step")![1];
        expect(step).toContain("{n}");
        expect(step).toContain("{count}");
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

  // The club stays on one line in About me: hard spaces (U+00A0) between its words (Kay, phase 8; the second sentence since phase 9).
  // "_" shows them in a failure; a plain space looks the same as a hard one.
  it("keeps the club on one line", () => {
    const shown = (text: string) => text.replaceAll("\u00A0", "_");
    expect(shown(nl.about.text[1])).toContain("bij_HV_Unitas_in_Rolde,");
    expect(shown(en.about.text[1])).toContain("at_HV_Unitas_in_Rolde,");
  });

  // The link in About me is the product's short name (the first mention, "Handball Coachboard", is the description).
  it("links Coachboard by its short name in About me", () => {
    expect(nl.about.product).toHaveLength(3);
    expect(en.about.product).toHaveLength(3);
    expect(nl.about.product[1]).toBe("Coachboard");
    expect(en.about.product[1]).toBe("Coachboard");
  });

  it("uses the typographic apostrophe in English", () => {
    expect(languages.en.filter(([, value]) => value.includes("'"))).toEqual([]);
  });
});
