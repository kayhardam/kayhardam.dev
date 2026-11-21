import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The two palettes in tokens.css, as custom properties, and the contrasts the pages
// rely on (WCAG 2.2 AA): text at least 4.5:1, large text and lines (players, the
// ball, the court's lines, the focus ring) at least 3:1. "Inkt" (Kay, 20 November
// 2026) is the holding page's and the 404 page's; "Hars" (Kay, 15 November 2026)
// is the full page's.

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

const INKT = {
  papier: "#fdfbf8",
  linnen: "#f5f1eb",
  inkt: "#1f1a17",
  grafiet: "#4a433d",
  inktblauw: "#1e40af",
} as const;

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

const colours = { ...INKT, ...HARS };
type Colour = keyof typeof colours;

/** The colours in the :root block that follows the comment naming the palette. */
function palette(name: string): Record<string, string> {
  const start = css.indexOf(":root {", css.indexOf(`The palette "${name}"`));
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8})\b/gi)].map(([, token, hex]) => [token!, hex!.toLowerCase()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: Colour, b: Colour): number {
  const [hi, lo] = [luminance(colours[a]), luminance(colours[b])].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("the tokens", () => {
  it("have no hex value outside the two palettes", () => {
    const all = [...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8})\b/gi)].map(([, token, hex]) => [token!, hex!.toLowerCase()]);
    expect(Object.fromEntries(all)).toEqual(colours);
    expect(all).toHaveLength(Object.keys(colours).length);
  });

  // The roles the shared parts use (base.css, Header.astro, 404.astro), per palette.
  it("fill the five roles from Inkt, and from Hars under data-palette", () => {
    const roles = (selector: string) => {
      const start = css.indexOf(`${selector} {\n  --ground`);
      const block = css.slice(start, css.indexOf("}", start));
      return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)/g)].map(([, role, token]) => [role!, token!]));
    };
    expect(roles(":root")).toEqual({ ground: "papier", "on-ground": "inkt", second: "grafiet", accent: "inktblauw", "on-accent": "papier" });
    expect(roles(':root[data-palette="hars"]')).toEqual({ ground: "espresso", "on-ground": "room", second: "zand", accent: "amber", "on-accent": "espresso" });
  });
});

describe("the palette Inkt", () => {
  it("is exactly the five colours, as custom properties", () => {
    expect(palette("Inkt")).toEqual(INKT);
  });

  // Text: the foreground on the background it stands on.
  it.each<[Colour, Colour]>([
    ["inkt", "papier"], // the header, the 404 page
    ["inkt", "linnen"], // the statement's first sentence, the sentence about Coachboard, the link
    ["grafiet", "papier"], // secondary text: the other language, the 404 page's sentence
    ["inktblauw", "linnen"], // the statement's second sentence
    ["inktblauw", "papier"], // a link under the pointer, on the 404 page
    ["papier", "inktblauw"], // the address on the foot
  ])("text: %s on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // Lines: what has to be seen against what it touches.
  it.each<[Colour, Colour]>([
    ["inktblauw", "papier"], // the focus ring on the ground, the line under a link on the 404 page
    ["inktblauw", "linnen"], // the focus ring on the stage, the line under the link
    ["papier", "inktblauw"], // the ring's papier edge, on the ink-blue foot
  ])("a line: %s on %s is at least 3:1", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

describe("the palette Hars", () => {
  it("is exactly the eight colours, as custom properties", () => {
    expect(palette("Hars")).toEqual(HARS);
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
