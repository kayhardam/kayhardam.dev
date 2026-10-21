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

/** An island as Astro writes it, with its opts HTML-escaped. */
const island = ({ name = "BoardCard", client = "visible" } = {}) =>
  `<astro-island component-url="/_astro/Card.js" renderer-url="/_astro/renderer.js" client="${client}" ` +
  `opts="{&quot;name&quot;:&quot;${name}&quot;,&quot;value&quot;:true}"></astro-island>`;

/** The island's files: the card and the renderer both import the shared runtime. */
const islandFiles = {
  "_astro/Card.js": `import{a as b}from"./shared.js";export default function Card(){return b}`,
  "_astro/renderer.js": `import{a}from"./shared.js";export default a`,
  "_astro/shared.js": "export const a = 1;",
};

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
    ["an inline script without the island", "<script>console.log(1)</script>", /an inline script only with the island/],
    ["a script file", `<script type="module" src="/_astro/x.js"></script>`, /the only JS is the board's island/],
    ["a script file next to the island", `${island()}<script src="/_astro/x.js"></script>`, /the only JS is the board's island/],
    ["a modulepreload", `<link rel="modulepreload" href="/_astro/x.js">`, /the only JS is the board's island/],
    ["a second island", `${island()}${island()}`, /a page has at most one island/],
    ["another island", island({ name: "Other" }), /the island is BoardCard with client="visible"/],
    ["the island with client:load", island({ client: "load" }), /the island is BoardCard with client="visible"/],
    ["a third inline script", `${island()}<script>1</script><script>2</script><script>3</script>`, /at most 2 inline scripts/],
  ])("fails on %s", (_, html, why) => {
    const { rows, errors } = build({ "en/index.html": html, ...islandFiles });
    expect(errors).toEqual([expect.stringMatching(why)]);
    expect(errors[0]).toMatch(/^\/en\/: /);
    expect(row(rows, "Scripts").measured).toBe(1);
  });

  it("allows the board's island with Astro's two inline scripts", () => {
    const html = `<script>a</script><script>b</script>${island()}`;
    const { rows, errors } = build({ "index.html": html, ...islandFiles });
    expect(errors).toEqual([]);
    expect(row(rows, "Scripts").measured).toBe(0);
  });

  it("fails on the island on the 404 page", () => {
    const { errors } = build({ "404.html": island(), ...islandFiles });
    expect(errors).toEqual([expect.stringMatching(/^\/404\.html: the 404 page ships no JS/)]);
  });

  it("measures the island's JS gzipped: its two files and what they import statically", () => {
    const { rows, errors } = build({ "index.html": island(), ...islandFiles });
    expect(errors).toEqual([]);
    const all = Object.values(islandFiles).reduce((total, code) => total + gz(code), 0);
    expect(row(rows, "JS (gzip)", "/").measured).toBe(all);
    expect(row(rows, "Lazy JS (gzip)", "/").measured).toBe(0);
    expect(row(rows, "All JS (gzip)").measured).toBe(all);
  });

  it("counts a dynamic import as lazy JS, over its budget of 0", () => {
    const files = { ...islandFiles, "_astro/Card.js": "import(`./lazy.js`);", "_astro/lazy.js": "export const late = 1;" };
    const { rows, errors } = build({ "index.html": island(), ...files });
    expect(row(rows, "Lazy JS (gzip)", "/").measured).toBe(gz(files["_astro/lazy.js"]));
    expect(errors).toEqual([expect.stringMatching(/^Lazy JS \(gzip\) \/: .* is over the budget of 0\.0 KB$/)]);
  });

  it("fails on JS over its budget, and on a missing import", () => {
    const files = { ...islandFiles, "_astro/renderer.js": `import "./gone.js";` };
    const { errors } = build({ "index.html": island(), ...files }, { ...BUDGETS, js: 10, allJs: 10 });
    expect(errors).toEqual([
      "/: _astro/renderer.js imports missing ./gone.js",
      expect.stringMatching(/^JS \(gzip\) \/: /),
      expect.stringMatching(/^All JS \(gzip\) \/_astro\/: /),
    ]);
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

  it("measures every share image raw and fails over the budget", () => {
    const { rows, errors } = build(
      { "index.html": "", "og-en.png": "x".repeat(300), "og-nl.png": "x".repeat(100), "og.png": "x", "_astro/og-nl.png": "x" },
      { ...BUDGETS, shareImage: 200 },
    );
    expect(rows.filter((r) => r.budget === "Share image").map((r) => [r.item, r.measured])).toEqual([
      ["/og-en.png", 300],
      ["/og-nl.png", 100],
    ]);
    expect(errors).toEqual(["Share image /og-en.png: 0.3 KB is over the budget of 0.2 KB"]);
  });

  it("has no share image row without the images", () => {
    const { rows, errors } = build({ "index.html": "" });
    expect(row(rows, "Share image")).toBeUndefined();
    expect(errors).toEqual([]);
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
