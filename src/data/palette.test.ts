import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { palette } from "./palette";

// The site is in one palette, and it is the home page's: Inkt with the holding page,
// Hars with the full page (AGENTS.md, "The holding page"). Bringing the full page back
// takes both: Home.astro in the two page files, and "hars" in palette.ts.

const pages = ["../pages/index.astro", "../pages/en/index.astro"];

/** The components a page file imports: its import lines, not what a comment names. */
function components(path: string): string[] {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  return [...source.matchAll(/^import \w+ from "(?:\.\.\/)+components\/(\w+)\.astro";$/gm)].map(([, name]) => name!);
}

describe("the site's palette", () => {
  it.each(pages)("%s: the holding page in inkt, or the full page in hars", (path) => {
    const imported = components(path);
    expect(imported).toHaveLength(1);
    expect(["Holding", "Home"]).toContain(imported[0]);
    expect(palette).toBe(imported[0] === "Holding" ? "inkt" : "hars");
  });
});
