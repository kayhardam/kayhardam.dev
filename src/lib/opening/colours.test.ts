import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { END, SCENE, css } from "./colours";

// The scene's colours that are also the page's or Coachboard's: the page's ground and its
// orange and marine (tokens.css), and the court, the arrows and the board at the end as
// Court.svelte draws them, so the scene's board is exactly the one that fades in over it.

const tokens = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8");
const court = readFileSync(new URL("../../components/board/Court.svelte", import.meta.url), "utf8");

/** A token's value in tokens.css. */
const token = (name: string) => tokens.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))?.[1];
/** A colour in Court.svelte's `colors`. */
const drawn = (name: string) => court.match(new RegExp(`\\b${name}: "(#[0-9a-f]{6})"`))?.[1];

describe("the scene's colours", () => {
  it.each([
    ["ground", "krijt"],
    ["attack", "oranje"],
    ["attackLegs", "oranje-donker"],
    ["attackLabel", "marine"],
    ["defense", "marine"],
    ["scoreHome", "oranje"],
  ] as const)("%s is the token %s", (key, name) => {
    expect(css(SCENE[key])).toBe(token(name));
  });

  it.each([
    ["court", "court"],
    ["goalArea", "area"],
    ["lines", "line"],
    ["trail", "ink"],
    ["defense", "defence"],
    ["keeper", "attack"],
  ] as const)("%s is Court.svelte's %s", (key, name) => {
    expect(css(SCENE[key])).toBe(drawn(name));
  });

  it("ends in Court.svelte's colours: the attack, the ball and its edge", () => {
    expect(css(END.attack)).toBe(drawn("attack"));
    expect(css(END.ball)).toBe(drawn("ball"));
    expect(css(END.ballEdge)).toBe(drawn("ballEdge"));
  });

  it("writes a colour as CSS does", () => {
    expect(css(0x0f172a)).toBe("#0f172a");
    expect(css(0xffffff)).toBe("#ffffff");
  });
});
