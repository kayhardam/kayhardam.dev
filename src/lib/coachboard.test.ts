import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The copies from Coachboard stay as they are at commit 4ceafd4 (15 October 2026).
// Without the line on top that names the source, each copy must have the SHA-256
// of the original, from `git show 4ceafd4:<path> | shasum -a 256` in Coachboard.
// To take a newer version: copy it again with git show, and update the hash here.

const originals: Record<string, string> = {
  "svelte.config.js": "f81bf057ff6344e84b49fdcbff2957a545d29cd1226dc1f0c10c460a52a64b05",
  "src/components/board/Court.svelte": "8f76a1a49cee81c88e677e00965e2ca7f8b11d827ea93c854d8fbfb16bed9c6e",
  "src/lib/board/format.ts": "57f4296a0b62761bb448c017d85c058675857a7726969f0ce3a53e55a7202389",
  "src/lib/board/geometry.ts": "cace5e9796530e411ff48235507935665214004d7a2b9ba0e3db0875f39c059f",
  "src/lib/board/moves.ts": "8752815bfc55a938ec0670ecc7abd6aab7aa29d68411a6ad6e712f6adc01f35c",
  "src/lib/board/play.ts": "28335d2cf4f9b582e9191f1b4c0fbe126f2c505bfa4c9c9d2f3ab5a60517155c",
  "src/lib/board/viewer.ts": "5a62f8be7ae581885da9c40eadfd83e5a6cfec3fdabe815c125ba1e2f6f5ffee",
  "src/lib/viewerIcons.ts": "a54b8ef3d8b3dbe2cd4bc5f5c54f9e3011747e2ca183cbba6b54a32f6bd6395a",
  "src/lib/board/geometry.test.ts": "37392d5f78a4e0b2573325785565a62c605c662bc6bd922da726abd994f5e075",
  "src/lib/board/moves.test.ts": "5c59448404ff27902e800f01257b17c99342b301ce7af3846eb8716dd87d4370",
};

/** The one change in Court.svelte, the optional prop viewBox: [in the copy, in the original]. */
const courtChange: [string, string][] = [
  ["    label?: string;\n    viewBox?: string;\n", "    label?: string;\n"],
  ['label = "Handball court", viewBox: crop }', 'label = "Handball court" }'],
  ["$derived(crop ?? `-8 -14", "$derived(`-8 -14"],
];

/** A copy as it is here, with the one change in Court.svelte undone. */
function original(path: string): string {
  let text = readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  if (path.endsWith("Court.svelte")) {
    for (const [copy, before] of courtChange) {
      expect(text.split(copy)).toHaveLength(2);
      text = text.replace(copy, before);
    }
  }
  return text;
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

describe("the copies from Coachboard", () => {
  for (const [path, hash] of Object.entries(originals)) {
    it(`${path} is the original at 4ceafd4`, () => {
      const [source, ...rest] = original(path).split("\n");
      expect(source).toMatch(new RegExp(`^(//|<!--) From Coachboard, ${path} at commit 4ceafd4 \\(15 October 2026\\)`));
      expect(sha256(rest.join("\n"))).toBe(hash);
    });
  }
});
