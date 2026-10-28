import { render } from "svelte/server";
import { beforeAll, describe, expect, it } from "vitest";
import { boardFrom, boards, legendFor } from "../../data/boards";
import { nl } from "../../i18n/nl";
import BoardCard from "./BoardCard.svelte";

// The card as the server renders it: the HTML without JavaScript, which the
// island hydrates without changing it (e2e/play.spec.ts).

let board: Awaited<ReturnType<typeof boardFrom>>;
let body: string;
beforeAll(async () => {
  board = await boardFrom(boards.nl);
  body = render(BoardCard, { props: { board, legend: legendFor(board, "nl"), t: nl.board } }).body;
});

/** Every <button> tag, in order. */
const buttons = () => [...body.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);

describe("BoardCard.svelte on the server", () => {
  it("shows step 1 with its sentence and 1/4", () => {
    expect(body).toContain(`<span aria-hidden="true">1/4</span>`);
    expect(body).toContain(nl.board.step.replace("{n}", "1").replace("{count}", "4"));
    expect(body).toMatch(new RegExp(`<p class="board-step"[^>]*>${board.frames[0]!.text}</p>`));
  });

  it("has three buttons, disabled, without aria-disabled", () => {
    const tags = buttons();
    expect(tags).toHaveLength(3);
    for (const tag of tags) {
      expect(tag).toMatch(/\sdisabled(=""|(?=[\s>]))/);
      expect(tag).not.toContain("aria-disabled");
    }
  });

  it("has Play, with its aria-label and title", () => {
    const play = buttons()[1]!;
    expect(play).toContain(`aria-label="${nl.board.play}"`);
    expect(play).toContain(`title="${nl.board.play}"`);
  });

  it("reads out the step's sentence politely", () => {
    expect(body).toMatch(/<p class="board-step" aria-live="polite">/);
  });
});
