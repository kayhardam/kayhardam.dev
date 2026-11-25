import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { palette } from "./palette";

// The site is in one palette, and it is the home page's: Oranje with the landing page, Inkt with
// the holding page, Hars with the full page (AGENTS.md). Bringing another page back takes both:
// its component in the two page files, and its palette in palette.ts.

const pages = ["../pages/index.astro", "../pages/en/index.astro"];
const palettes = { Landing: "oranje", Holding: "inkt", Home: "hars" } as const;

/** The components a page file imports: its import lines, not what a comment names. */
function components(path: string): string[] {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  return [...source.matchAll(/^import \w+ from "(?:\.\.\/)+components\/(\w+)\.astro";$/gm)].map(([, name]) => name!);
}

describe("the site's palette", () => {
  it.each(pages)("%s: the landing page in oranje, the holding page in inkt, or the full page in hars", (path) => {
    const imported = components(path);
    expect(imported).toHaveLength(1);
    expect(Object.keys(palettes)).toContain(imported[0]);
    expect(palette).toBe(palettes[imported[0] as keyof typeof palettes]);
  });
});
