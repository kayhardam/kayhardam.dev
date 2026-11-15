import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The palette "Hars" (Kay, 15 November 2026): eight colours as custom properties
// in tokens.css, and the contrasts the page relies on (WCAG 2.2 AA): text at
// least 4.5:1, large text and lines (players, the ball, the court's lines, the
// focus ring) at least 3:1.

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

const HARS = {
  espresso: "#16110d",
  "walnoot-donker": "#261b12",
  walnoot: "#4a3421",
  "walnoot-licht": "#63472d",
  amber: "#ffb300",
  room: "#fff6e8",
  zand: "#d3c4b0",
  gloed: "#ff5a2b",
} as const;

type Colour = keyof typeof HARS;

/** The colours in the first :root block of tokens.css: the palette. */
function palette(): Record<string, string> {
  const block = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8})\b/gi)].map(([, name, hex]) => [name!, hex!.toLowerCase()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: Colour, b: Colour): number {
  const [hi, lo] = [luminance(HARS[a]), luminance(HARS[b])].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("the palette Hars", () => {
  it("is exactly the eight colours, as custom properties", () => {
    expect(palette()).toEqual(HARS);
  });

  // Text: the foreground on the background it stands on.
  it.each<[Colour, Colour]>([
    ["room", "espresso"], // running text, the header
    ["room", "walnoot-donker"], // the hero
    ["zand", "espresso"], // secondary text
    ["zand", "walnoot-donker"],
    ["amber", "espresso"], // the figures
    ["amber", "walnoot-donker"], // "Stap n/4", a step line's number
    ["espresso", "amber"], // the button, the active step line, the closing section
    ["room", "walnoot"], // a label on the court, "bal [x, y]"
  ])("text: %s on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // Lines and shapes: what has to be seen against what it touches.
  it.each<[Colour, Colour]>([
    ["room", "walnoot"], // the court's lines, arrows, the players' edges
    ["room", "walnoot-licht"], // the 6-metre line, the goal area
    ["amber", "walnoot"], // an attacker
    ["amber", "walnoot-licht"],
    ["gloed", "walnoot"], // the ball
    ["gloed", "espresso"], // the ball against its own edge
    ["amber", "walnoot-donker"], // the focus ring on the hero
    ["amber", "espresso"], // the focus ring on the ground
    ["espresso", "amber"], // the ring's espresso edge, on the amber closing section
  ])("a line: %s on %s is at least 3:1", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  // Known short, and how the page covers it: a defender (espresso) on the court
  // has an edge in room; the ball (gloed) in the goal area, where it lies after
  // the shot, gets a thin room ring around its espresso edge (agreed with Kay).
  it("needs an edge for a defender and for the ball in the goal area", () => {
    expect(contrast("espresso", "walnoot")).toBeLessThan(3);
    expect(contrast("gloed", "walnoot-licht")).toBeLessThan(3);
    expect(contrast("room", "walnoot")).toBeGreaterThanOrEqual(3);
    expect(contrast("room", "walnoot-licht")).toBeGreaterThanOrEqual(3);
  });
});
