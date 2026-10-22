// Checks the built site against size budgets. Run after `astro build`:
//   node scripts/check-budget.mjs
// After Coachboard's scripts/check-budget.mjs (commit 4ceafd4), cut down to
// what this site has: one island, the board card (phase 5).
//
// - The only JavaScript is the board's island: at most one <astro-island> per
//   page, and it is BoardCard with client="visible". The 404 page has none.
//   An inline <script> only on a page with the island: Astro's own, at most
//   two. No <script src> and no modulepreload. JSON-LD is allowed.
// - The island's JS: the files from its component-url and renderer-url plus
//   everything they import statically. Dynamic imports count as lazy JS.
// - All JS: every .js file in _astro/, so code moved into a lazy chunk still counts.
// - CSS and HTML per page. Astro inlines small stylesheets, so the HTML budget
//   also covers the CSS that sits in a <style>; the CSS budget covers the files
//   from <link rel="stylesheet">.
// - Every font file (woff2) the site serves.
// - The icons: favicon.svg, favicon.ico and apple-touch-icon.png.
// - The share image: og.png in the root, from scripts/og-image.mjs.
// - Every image a page shows: each file in the src and srcset of an <img> and
//   in the srcset of a <source>, with a budget per format (AVIF, WebP, JPEG).
//   A missing file is an error: scripts/check-links.mjs doesn't read srcset.
//
// Sizes are in KB of 1000 bytes; JS, CSS and HTML are gzipped (zlib default level),
// as in docs/metingen.md. Fonts and icons are counted raw: woff2 and PNG are
// compressed already, and the SVG is small. So are the share image and the photo.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

// Raise a budget only on purpose, and give the reason in the pull request.
// Measured (docs/metingen.md) plus about 15%: CSS and fonts in phase 1, icons in phase 3, JS and HTML in phase 5,
// the share image in phase 6 (details), the photo in phase 7.
export const BUDGETS = {
  js: 24_400, // 21.24 KB: the card (6.34), Svelte's runtime (14.40) and Astro's renderer (0.50)
  lazyJs: 0, // 0 KB: no dynamic imports
  allJs: 24_400, // 21.24 KB: the island's three files are all there is
  css: 1_000, // 0 KB: Astro inlines all CSS for now
  html: 11_100, // 9.62 KB for /, the largest page, with all texts, CSS and SVGs, the board's step 1, its props and Astro's two scripts
  font: 25_800, // 22.4 KB for Barlow Condensed 700, the largest
  icon: 5_600, // 4.9 KB for apple-touch-icon.png, the largest
  shareImage: 19_300, // 16.74 KB for og.png, the logo and kayhardam.dev
  // The largest file per format: the photo in About me at 799 px, from an original of 799 px.
  photo: {
    avif: 34_100, // 29.61 KB
    webp: 68_000, // 59.09 KB
    jpeg: 106_600, // 92.69 KB
  },
};

/** The format of an image file, by its extension, as in the keys of BUDGETS.photo. */
export const IMAGE_FORMATS = { ".avif": "avif", ".webp": "webp", ".jpg": "jpeg", ".jpeg": "jpeg" };

/** The icons in the root of the site, from scripts/favicons.mjs. */
export const ICONS = ["favicon.svg", "favicon.ico", "apple-touch-icon.png"];

/** The share image in the root of the site, one for both languages. */
export const SHARE_IMAGE = "og.png";

/** The one island: the board card, hydrated when it comes into view. */
export const ISLAND = { name: "BoardCard", client: "visible" };
/** Astro's inline scripts on a page with an island: its loader and the one for client:visible. */
export const ISLAND_SCRIPTS = 2;

const TAG = /<(script|astro-island|link|img|source)\b([^>]*)>/gi;
const ATTR = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
const STATIC_IMPORT = /(?:\bfrom|\bimport)\s*["']([^"']+\.js)["']/g;
// Vite writes dynamic imports with backticks: import(`./chunk.js`).
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["'`]([^"'`]+\.js)["'`]\s*\)/g;
const ENTITIES = { "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">", "&amp;": "&" };

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

/** The name in an island's opts attribute, or undefined when it has none. */
function islandName(opts) {
  try {
    return JSON.parse((opts ?? "").replace(/&(?:quot|#39|lt|gt|amp);/g, (e) => ENTITIES[e])).name;
  } catch {
    return undefined;
  }
}

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

  /** The .js files a set of entry files imports, statically and dynamically. */
  function importGraph(entries, where) {
    const eager = new Set();
    const lazy = new Set();
    const visit = (file, set) => {
      if (eager.has(file) || set.has(file)) return;
      set.add(file);
      const code = readFileSync(file, "utf8");
      for (const [pattern, target] of [
        [STATIC_IMPORT, set],
        [DYNAMIC_IMPORT, lazy],
      ]) {
        for (const [, spec] of code.matchAll(pattern)) {
          if (!spec.startsWith(".")) continue;
          const path = join(dirname(file), spec);
          if (existsSync(path)) visit(path, target);
          else errors.push(`${where}: ${relative(dist, file)} imports missing ${spec}`);
        }
      }
    };
    for (const entry of entries) visit(entry, eager);
    for (const file of eager) lazy.delete(file);
    return { eager, lazy };
  }

  const sum = (paths) => [...paths].reduce((total, path) => total + gzipped(path), 0);

  const pages = [...files(dist, ".html")].map((file) => relative(dist, file).split(sep).join("/")).sort();
  let scripts = 0;
  // A file that is on two pages is measured once.
  const images = new Set();

  for (const page of pages) {
    const file = join(dist, page);
    const url = `/${page.replace(/(^|\/)index\.html$/, "$1")}`;
    const html = readFileSync(file, "utf8");
    const stylesheets = [];
    const islands = [];
    const inline = [];
    const forbid = (found, why = "the only JS is the board's island") => {
      scripts++;
      errors.push(`${url}: ${why}, found ${found}`);
    };

    for (const [, tag, source] of html.matchAll(TAG)) {
      const a = attrs(source);
      const name = tag.toLowerCase();
      if (name === "script") {
        if (a.type?.toLowerCase() === "application/ld+json") continue;
        if (a.src) forbid(`<script${source}>`);
        else inline.push(`<script${source}>`);
      } else if (name === "astro-island") {
        islands.push(a);
      } else if (name === "img" || name === "source") {
        const urls = (a.srcset ?? "").split(",").map((candidate) => candidate.trim().split(/\s+/)[0]);
        for (const src of [a.src, ...urls].filter(Boolean)) {
          const path = resolve(src.replace(/&amp;/g, "&"), url);
          if (!path || images.has(path)) continue;
          images.add(path);
          const format = IMAGE_FORMATS[extname(path).toLowerCase()];
          if (format) measure("Photo", src, statSync(path).size, budgets.photo[format]);
          else errors.push(`${url}: ${src} has no image budget (only AVIF, WebP and JPEG)`);
        }
      } else {
        const rel = (a.rel ?? "").toLowerCase().split(/\s+/);
        if (rel.includes("modulepreload")) forbid(`<link rel="modulepreload">`);
        if (rel.includes("stylesheet") && a.href) stylesheets.push(a.href);
      }
    }

    if (page === "404.html") {
      if (islands.length > 0) forbid("<astro-island>", "the 404 page ships no JS");
    } else {
      if (islands.length > 1) forbid(`${islands.length} <astro-island>s`, "a page has at most one island");
      for (const island of islands) {
        const name = islandName(island.opts);
        if (name !== ISLAND.name || island.client !== ISLAND.client) {
          forbid(`<astro-island> ${name ?? "without a name"} with client="${island.client ?? ""}"`, `the island is ${ISLAND.name} with client="${ISLAND.client}"`);
        }
      }
    }
    if (islands.length === 0) {
      for (const tag of inline) forbid(tag, "an inline script only with the island");
    } else {
      for (const tag of inline.slice(ISLAND_SCRIPTS)) forbid(tag, `at most ${ISLAND_SCRIPTS} inline scripts with the island`);
      const entries = islands
        .flatMap((a) => [a["component-url"], a["renderer-url"]])
        .filter(Boolean)
        .map((src) => resolve(src, url))
        .filter(Boolean);
      const { eager, lazy } = importGraph(new Set(entries), url);
      measure("JS (gzip)", url, sum(eager), budgets.js);
      measure("Lazy JS (gzip)", url, sum(lazy), budgets.lazyJs);
    }

    const css = stylesheets.map((href) => resolve(href, url)).filter(Boolean);
    measure("CSS (gzip)", url, sum(new Set(css)), budgets.css);
    measure("HTML (gzip)", url, gzipped(file), budgets.html);
  }

  // Each script found is already an error with its page; this row is the summary.
  rows.push({ budget: "Scripts", item: `${pages.length} pages`, measured: scripts, limit: 0, unit: "" });

  const astro = join(dist, "_astro");
  measure("All JS (gzip)", "/_astro/", existsSync(astro) ? sum(files(astro, ".js")) : 0, budgets.allJs);

  for (const file of [...files(dist, ".woff2")].sort()) {
    const url = `/${relative(dist, file).split(sep).join("/")}`;
    measure("Font", url, statSync(file).size, budgets.font);
  }

  // Only the icons that are there: scripts/check-links.mjs fails on a missing one.
  for (const name of ICONS) {
    const file = join(dist, name);
    if (existsSync(file)) measure("Icon", `/${name}`, statSync(file).size, budgets.icon);
  }

  // Only when it is there: scripts/check-links.mjs fails when og:image points to a missing file.
  const shareImage = join(dist, SHARE_IMAGE);
  if (existsSync(shareImage)) measure("Share image", `/${SHARE_IMAGE}`, statSync(shareImage).size, budgets.shareImage);

  const order = ["JS (gzip)", "Lazy JS (gzip)", "All JS (gzip)", "Scripts", "CSS (gzip)", "HTML (gzip)", "Font", "Icon", "Share image", "Photo"];
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
