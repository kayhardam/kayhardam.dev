import { describe, expect, it } from "vitest";
import { nl } from "../i18n/nl";
import { evidence } from "./links";

// The three figures and their evidence, as Kay gave them (Hars, 15 November 2026): pinned
// here word for word, so a change to a text or to a line range is a decision, not a slip.
describe("the figures and their evidence", () => {
  const at = "https://github.com/kayhardam/coachboard/blob/03be23bea71d6bffa37d5af567b88376d3d592cc/docs/metingen.md?plain=1";

  it("links each figure to its lines in Coachboard at 03be23b", () => {
    expect(evidence).toEqual([`${at}#L352-L373`, `${at}#L1246-L1250`, `${at}#L495-L555`]);
  });

  it("has Kay's three Dutch sentences", () => {
    expect(nl.figures.map((f) => `${f.value} ${f.rest} ${f.was}`)).toEqual([
      "12/12 schermen met elke knop in beeld. Dat waren er 3.",
      "4 handelingen om een aanval te tekenen en te delen. Dat waren er 6.",
      "1 px verspringt het veld hooguit bij het laden. Dat was 52 px.",
    ]);
  });
});
