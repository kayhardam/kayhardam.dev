import { render } from "svelte/server";
import { beforeAll, describe, expect, it } from "vitest";
import { boards } from "../../data/boards";
import { decode, type Board } from "../../lib/board/format";
import Court from "./Court.svelte";

// The court as Astro renders it at build time, with the one prop this site adds.

let board: Board;
beforeAll(async () => {
  board = (await decode(decodeURIComponent(boards.nl.split("#t=")[1]!)))!;
});

/** The court's <svg> tag and the whole of its HTML. */
function court(props: Record<string, unknown> = {}) {
  const { body } = render(Court, { props: { board, ...props } });
  const tag = body.match(/<svg\b[^>]*>/)![0];
  const attr = (name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  return { body, attr };
}

describe("Court.svelte", () => {
  it("without the prop, works out its viewBox as in Coachboard: a half court", () => {
    expect(court().attr("viewBox")).toBe("-8 -14 216 222");
  });

  it("with the prop, has exactly that viewBox", () => {
    expect(court({ viewBox: "-8 -14 216 174" }).attr("viewBox")).toBe("-8 -14 216 174");
  });

  it("is an image with its label", () => {
    const { attr } = court({ label: "Handbalveld" });
    expect(attr("role")).toBe("img");
    expect(attr("aria-label")).toBe("Handbalveld");
  });

  it("draws the 13 players of the Dutch board, with their labels", () => {
    const { body } = court();
    expect(body.match(/data-kind="player"/g)).toHaveLength(13);
    expect([...body.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => m[1])).toEqual([
      "LH",
      "LO",
      "MO",
      "RO",
      "RH",
      "CL",
      "K",
    ]);
  });
});
