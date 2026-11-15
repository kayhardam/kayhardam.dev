import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The palette Hars (Kay, 15 November 2026): eight colours as custom properties in
// tokens.css, and nowhere a loose hex value. Allowed, each for its reason:
// - tokens.css: where the eight are defined (tokens.test.ts checks them);
// - Court.svelte: Coachboard's copy, unchanged (src/lib/coachboard.test.ts);
// - board.css: Court.svelte's colours as selectors, [fill="#…"], which give each
//   its Hars token; never as a value;
// - BaseLayout.astro: theme-color, as a <meta> can't read a custom property; it
//   must be espresso.

const root = new URL("../../", import.meta.url).pathname;
const hex = /#[0-9a-f]{3,8}\b/gi;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}

const files = [
  ...walk(join(root, "src")).filter((f) => /\.(astro|css|svelte|ts)$/.test(f) && !/\.test\.ts$/.test(f)),
  ...readdirSync(join(root, "public")).filter((f) => f.endsWith(".svg")).map((f) => join(root, "public", f)),
].map((f) => relative(root, f));

/** Every hex value in `file` that its reason doesn't allow, as "file:line: line". */
function loose(file: string): string[] {
  const lines = readFileSync(join(root, file), "utf8").split("\n");
  return lines.flatMap((line, i) => {
    const found = line.match(hex);
    if (!found) return [];
    if (file === "src/components/board/Court.svelte") return [];
    // The favicons are images, made by scripts/favicons.mjs; the colours of the logo, not of the page.
    if (file.startsWith("public/")) return [];
    if (file === "src/styles/tokens.css" && /^\s*--[\w-]+:\s*#[0-9a-f]{6};/i.test(line)) return [];
    if (file === "src/components/board/board.css" && /^\.board .*\[(fill|stroke)="#[0-9a-f]{6}"\].*[{,]$/i.test(line.trim())) return [];
    if (file === "src/layouts/BaseLayout.astro" && line.includes('name="theme-color" content="#16110d"')) return [];
    // Comments that name a colour don't paint anything.
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return [];
    return [`${file}:${i + 1}: ${line.trim()}`];
  });
}

describe("colours", () => {
  it("has no loose hex value: only the eight tokens of Hars", () => {
    expect(files.flatMap(loose)).toEqual([]);
  });

  it("has theme-color espresso", () => {
    const tokens = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
    expect(tokens).toMatch(/--espresso: #16110d;/);
    expect(readFileSync(join(root, "src/layouts/BaseLayout.astro"), "utf8")).toContain('content="#16110d"');
  });

  it("has no green anywhere but in Court.svelte's copy, and in board.css only as a selector", () => {
    const green = /#(15803d|16a34a|4ade80|22c55e)\b/i;
    const found = files
      .filter((f) => f !== "src/components/board/Court.svelte")
      .flatMap((file) =>
        readFileSync(join(root, file), "utf8")
          .split("\n")
          .flatMap((line, i) => (green.test(line) && !(file.endsWith("board.css") && /\[fill="#15803d"\].*\{$/.test(line.trim())) ? [`${file}:${i + 1}`] : [])),
      );
    expect(found).toEqual([]);
  });
});
