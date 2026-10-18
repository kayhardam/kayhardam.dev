// Checks the built site against size budgets. Run after `astro build`:
//   node scripts/check-budget.mjs
// After Coachboard's scripts/check-budget.mjs (commit 4ceafd4), cut down to
// what this site has. Phase 5 adds the board's island and its JS budget.
//
// - No page ships JavaScript: no <script> other than JSON-LD, no
//   <astro-island>, no modulepreload.
// - CSS and HTML per page. Astro inlines small stylesheets, so the HTML budget
//   also covers the CSS that sits in a <style>; the CSS budget covers the files
//   from <link rel="stylesheet">.
// - Every font file (woff2) the site serves.
//
// Sizes are in KB of 1000 bytes; CSS and HTML are gzipped (zlib default level),
// as in docs/metingen.md. Fonts are counted raw: woff2 is compressed already.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

// Raise a budget only on purpose, and give the reason in the pull request.
// Measured (docs/metingen.md) plus about 15%: CSS and fonts in phase 1, HTML in phase 2.
export const BUDGETS = {
  css: 1_000, // 0 KB: Astro inlines all CSS for now
  html: 4_800, // 4.1 KB for / and /en/, the largest pages, with all texts and CSS
  font: 25_800, // 22.4 KB for Barlow Condensed 700, the largest
};

const TAG = /<(script|astro-island|link)\b([^>]*)>/gi;
const ATTR = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

function* files(dir, ext) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path, ext);
    else if (entry.name.endsWith(ext)) yield path;
  }
}

function attrs(source) {
  const result = {};
  for (const [, name, dq, sq, bare] of source.matchAll(ATTR)) {
    result[name.toLowerCase()] = dq ?? sq ?? bare;
  }
  return result;
}

const gzipped = (path) => gzipSync(readFileSync(path)).length;

/**
 * @param {string} dist     directory with the built site
 * @param {typeof BUDGETS} budgets
 * @returns {{ rows: { budget: string, item: string, measured: number, limit: number, unit: string }[], errors: string[] }}
 */
export function checkBudget(dist, budgets = BUDGETS) {
  const rows = [];
  const errors = [];

  /** Adds a row, and an error when the measured value is over its limit. */
  function measure(budget, item, measured, limit, unit = "KB") {
    rows.push({ budget, item, measured, limit, unit });
    if (measured > limit) {
      errors.push(`${budget} ${item}: ${format(measured, unit)} is over the budget of ${format(limit, unit)}`);
    }
  }

  /** The file a site-relative URL points to, or null (with an error) when it is missing. */
  function resolve(url, where) {
    if (!url.startsWith("/") || url.startsWith("//")) return null;
    const path = join(dist, decodeURIComponent(url.split(/[?#]/)[0]));
    if (existsSync(path)) return path;
    errors.push(`${where}: ${url} is missing`);
    return null;
  }

  const sum = (paths) => [...paths].reduce((total, path) => total + gzipped(path), 0);

  const pages = [...files(dist, ".html")].map((file) => relative(dist, file).split(sep).join("/")).sort();
  let scripts = 0;

  for (const page of pages) {
    const file = join(dist, page);
    const url = `/${page.replace(/(^|\/)index\.html$/, "$1")}`;
    const html = readFileSync(file, "utf8");
    const stylesheets = [];
    const forbid = (found) => {
      scripts++;
      errors.push(`${url}: pages ship no JS, found ${found}`);
    };

    for (const [, tag, source] of html.matchAll(TAG)) {
      const a = attrs(source);
      const name = tag.toLowerCase();
      if (name === "script") {
        if (a.type?.toLowerCase() !== "application/ld+json") forbid(`<script${source}>`);
      } else if (name === "astro-island") {
        forbid("<astro-island>");
      } else {
        const rel = (a.rel ?? "").toLowerCase().split(/\s+/);
        if (rel.includes("modulepreload")) forbid(`<link rel="modulepreload">`);
        if (rel.includes("stylesheet") && a.href) stylesheets.push(a.href);
      }
    }

    const css = stylesheets.map((href) => resolve(href, url)).filter(Boolean);
    measure("CSS (gzip)", url, sum(new Set(css)), budgets.css);
    measure("HTML (gzip)", url, gzipped(file), budgets.html);
  }

  // Each script found is already an error with its page; this row is the summary.
  rows.push({ budget: "Scripts", item: `${pages.length} pages`, measured: scripts, limit: 0, unit: "" });

  for (const file of [...files(dist, ".woff2")].sort()) {
    const url = `/${relative(dist, file).split(sep).join("/")}`;
    measure("Font", url, statSync(file).size, budgets.font);
  }

  const order = ["Scripts", "CSS (gzip)", "HTML (gzip)", "Font"];
  rows.sort((a, b) => order.indexOf(a.budget) - order.indexOf(b.budget));
  return { rows, errors };
}

/** Bytes as KB with one decimal; a count stays a count. */
export function format(value, unit) {
  return unit === "KB" ? `${(value / 1000).toFixed(1)} KB` : String(value);
}

/** The rows as an aligned plain-text table. */
export function table(rows) {
  const lines = [["Budget", "Item", "Measured", "Budget", ""]];
  for (const { budget, item, measured, limit, unit } of rows) {
    lines.push([budget, item, format(measured, unit), format(limit, unit), measured > limit ? "OVER" : "ok"]);
  }
  const widths = lines[0].map((_, i) => Math.max(...lines.map((line) => line[i].length)));
  const right = [false, false, true, true, false];
  return lines
    .map((line) =>
      line
        .map((cell, i) => (right[i] ? cell.padStart(widths[i]) : cell.padEnd(widths[i])))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  const { rows, errors } = checkBudget(dist);
  console.log(table(rows));

  if (errors.length > 0) {
    console.error(`\nBudget check failed (${errors.length}):\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\nBudget OK: ${rows.length} checks.`);
}
