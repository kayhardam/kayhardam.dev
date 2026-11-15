import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// No green on the site (a club colour: Kay, phase 8), and since the palette Hars
// (Kay, 15 November 2026) not on the board either. The one place it is left is
// Court.svelte, Coachboard's unchanged copy (src/lib/coachboard.test.ts):
// board.css gives its colours their Hars tokens, picking each by its attribute.
// So green may be in Court.svelte, and in board.css only as such a selector.

const root = new URL("../../", import.meta.url).pathname;
const green = /#(15803d|16a34a|4ade80|22c55e)\b|--color-green/i;
const copy = "src/components/board/Court.svelte";
const recolour = "src/components/board/board.css";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}

const files = [
  ...walk(join(root, "src")).filter((f) => /\.(astro|css|ts|svelte)$/.test(f)),
  ...readdirSync(join(root, "public")).filter((f) => f.endsWith(".svg")).map((f) => join(root, "public", f)),
]
  .map((f) => relative(root, f))
  .filter((f) => f !== "src/styles/colours.test.ts" && f !== copy);

describe("colours", () => {
  it("has green only in Court.svelte's copy, and in board.css only as a selector that recolours it", () => {
    const found = files.flatMap((file) =>
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .map((line, i) => [file, `${file}:${i + 1}`, line.trim()] as const)
        .filter(([, , line]) => green.test(line))
        .filter(([f, , line]) => !(f === recolour && /\[fill="#15803d"\].*\{$/.test(line)))
        .map(([, where, line]) => `${where}: ${line}`),
    );
    expect(found).toEqual([]);
  });
});
