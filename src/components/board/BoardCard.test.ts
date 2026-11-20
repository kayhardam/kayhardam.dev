import { render } from "svelte/server";
import { beforeAll, describe, expect, it } from "vitest";
import { boardFrom, boards, stepsFor } from "../../data/boards";
import { nl } from "../../i18n/nl";
import BoardCard from "./BoardCard.svelte";

// The hero as the server renders it: the HTML without JavaScript, which the
// island hydrates without changing it (e2e/play.spec.ts).

let board: Awaited<ReturnType<typeof boardFrom>>;
let body: string;
beforeAll(async () => {
  board = await boardFrom(boards.nl);
  const steps = stepsFor(board, "nl");
  body = render(BoardCard, { props: { board, steps, link: boards.nl, edit: nl.hero.button, locale: "nl", t: nl.board } }).body;
});

/** Every <button> tag, in order. */
const buttons = () => [...body.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);

describe("BoardCard.svelte on the server", () => {
  it("shows step 1 with its sentence and Stap 1/4", () => {
    expect(body).toContain(`<span aria-hidden="true">Stap 1/4</span>`);
    expect(body).toContain(nl.board.step.replace("{n}", "1").replace("{count}", "4"));
    // A word per line: "AI" and "verkent.".
    const [first, second] = board.frames[0]!.text!.split(" ");
    expect(body).toMatch(new RegExp(`<p class="board-step"[^>]*>(<!--[^>]*-->)?<span>${first}</span> <span>${second}</span>`));
  });

  it("has Play and four step lines, all off, without aria-disabled", () => {
    const tags = buttons();
    expect(tags).toHaveLength(5);
    for (const tag of tags) {
      expect(tag).toMatch(/\sdisabled(=""|(?=[\s>]))/);
      expect(tag).not.toContain("aria-disabled");
    }
  });

  it("has Play, with its aria-label and title", () => {
    const play = buttons()[0]!; // before the counter
    expect(play).toContain(`aria-label="${nl.board.play}"`);
    expect(play).toContain(`title="${nl.board.play}"`);
  });

  it("marks step 1's line as the current step, and only that one", () => {
    const lines = buttons().slice(1);
    expect(lines.map((tag) => tag.includes(`aria-current="step"`))).toEqual([true, false, false, false]);
  });

  it("reads out the step's whole sentence politely", () => {
    expect(body).toMatch(/<p class="board-step" aria-live="polite" aria-atomic="true">/);
  });

  it("links to the attack in Coachboard", () => {
    expect(body).toContain(`<a class="board-edit" href="${boards.nl}">${nl.hero.button}</a>`);
  });

  it("labels the ball where step 1 has it, in metres", () => {
    expect(board.frames[0]!.balls).toEqual([[110, 122]]);
    expect(body).toMatch(/<text [^>]*>bal \[11,0; 12,2\]<\/text>/);
  });

  it("has no style attribute: the CSP doesn't allow one", () => {
    expect(body).not.toMatch(/\sstyle=/);
  });
});
