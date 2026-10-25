import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Colour comes only from the photo and from Coachboard's board card; the rest
// is navy, white and grey (Kay, phase 8). Green may be in the card's three
// files, and in the one token they use.

const root = new URL("../../", import.meta.url).pathname;
const green = /#(15803d|16a34a|4ade80|22c55e)\b|--color-green/i;
const allowed = ["src/components/board/board.css", "src/components/board/BoardCard.svelte", "src/components/board/Court.svelte"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}

const files = [
  ...walk(join(root, "src")).filter((f) => /\.(astro|css|ts|svelte)$/.test(f)),
  ...readdirSync(join(root, "public")).filter((f) => f.endsWith(".svg")).map((f) => join(root, "public", f)),
]
  .map((f) => relative(root, f))
  .filter((f) => f !== "src/styles/colours.test.ts" && !allowed.includes(f));

describe("colours", () => {
  it("has green only in the board's card", () => {
    const found = files.flatMap((file) =>
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .map((line, i) => [`${file}:${i + 1}`, line.trim()] as const)
        .filter(([, line]) => green.test(line))
        .map(([where, line]) => `${where}: ${line}`),
    );
    expect(found).toEqual([expect.stringMatching(/^src\/styles\/tokens\.css:\d+: --color-green-dark: #15803d;/)]);
  });
});
