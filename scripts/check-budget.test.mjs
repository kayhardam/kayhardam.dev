import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { BUDGETS, checkBudget, table } from "./check-budget.mjs";

// After Coachboard's scripts/check-budget.test.mjs (commit 4ceafd4).
let dist;

function build(files, budgets = BUDGETS) {
  dist = mkdtempSync(join(tmpdir(), "check-budget-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, path)), { recursive: true });
    writeFileSync(join(dist, path), content);
  }
  return checkBudget(dist, budgets);
}

const gz = (text) => gzipSync(text).length;
const row = (rows, budget, item) => rows.find((r) => r.budget === budget && (item === undefined || r.item === item));

afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe("checkBudget", () => {
  it("accepts pages without scripts and allows JSON-LD", () => {
    const { rows, errors } = build({
      "index.html": `<script type="application/ld+json">{"@type":"Person"}</script>`,
      "en/index.html": "<p>Home</p>",
    });
    expect(errors).toEqual([]);
    expect(row(rows, "Scripts")).toMatchObject({ item: "2 pages", measured: 0 });
  });

  it.each([
    ["an inline script", "<script>console.log(1)</script>"],
    ["a script file", `<script type="module" src="/_astro/x.js"></script>`],
    ["an island", `<astro-island component-url="/_astro/x.js"></astro-island>`],
    ["a modulepreload", `<link rel="modulepreload" href="/_astro/x.js">`],
  ])("fails on %s", (_, html) => {
    const { rows, errors } = build({ "en/index.html": html, "_astro/x.js": "" });
    expect(errors).toEqual([expect.stringMatching(/^\/en\/: pages ship no JS/)]);
    expect(row(rows, "Scripts").measured).toBe(1);
  });

  it("measures HTML and linked CSS gzipped, per page", () => {
    const html = `<link rel="stylesheet" href="/_astro/a.css"><p>Hallo</p>`;
    const css = "body{color:red}";
    const { rows, errors } = build({ "index.html": html, "_astro/a.css": css });
    expect(errors).toEqual([]);
    expect(row(rows, "HTML (gzip)", "/").measured).toBe(gz(html));
    expect(row(rows, "CSS (gzip)", "/").measured).toBe(gz(css));
  });

  it("fails on a missing stylesheet", () => {
    const { errors } = build({ "index.html": `<link rel="stylesheet" href="/_astro/gone.css">` });
    expect(errors).toEqual(["/: /_astro/gone.css is missing"]);
  });

  it("measures every woff2 raw and fails over the budget", () => {
    const { rows, errors } = build(
      { "index.html": "", "_astro/a.woff2": "x".repeat(300) },
      { ...BUDGETS, font: 200 },
    );
    expect(row(rows, "Font", "/_astro/a.woff2").measured).toBe(300);
    expect(errors).toEqual(["Font /_astro/a.woff2: 0.3 KB is over the budget of 0.2 KB"]);
  });

  it("measures the three icons raw and fails over the budget", () => {
    const { rows, errors } = build(
      { "index.html": "", "favicon.svg": "x".repeat(100), "favicon.ico": "x".repeat(200), "apple-touch-icon.png": "x".repeat(300) },
      { ...BUDGETS, icon: 200 },
    );
    expect(rows.filter((r) => r.budget === "Icon").map((r) => [r.item, r.measured])).toEqual([
      ["/favicon.svg", 100],
      ["/favicon.ico", 200],
      ["/apple-touch-icon.png", 300],
    ]);
    expect(errors).toEqual(["Icon /apple-touch-icon.png: 0.3 KB is over the budget of 0.2 KB"]);
  });

  it("prints a table with OVER next to a row over its budget", () => {
    const out = table([
      { budget: "HTML (gzip)", item: "/", measured: 3000, limit: 2000, unit: "KB" },
      { budget: "Scripts", item: "1 pages", measured: 0, limit: 0, unit: "" },
    ]);
    expect(out).toMatch(/HTML \(gzip\)\s+\/\s+3\.0 KB\s+2\.0 KB\s+OVER/);
    expect(out).toMatch(/Scripts\s+1 pages\s+0\s+0\s+ok/);
  });
});
