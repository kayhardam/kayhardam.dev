// From Coachboard, scripts/check-links.mjs at commit 4ceafd4 (15 October 2026), unchanged.
// Checks every internal link in the built site. Run after `astro build`:
//   node scripts/check-links.mjs
//
// A link is internal when it starts with "/" or with the site's own origin
// (canonical, og:image, hreflang). For each one, ignoring ?query and #hash:
// - a page link (no file extension) must end in "/" and have dist/<path>/index.html
// - a file link must have dist/<path>
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ATTR = /\s(href|src|content)=(?:"([^"]*)"|'([^']*)')/g;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

/** The site-relative path of an internal URL, or null for anything else. */
function internalPath(value, origin) {
  const url = value.replaceAll("&amp;", "&");
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url === origin || url.startsWith(`${origin}/`)) return url.slice(origin.length) || "/";
  return null;
}

/**
 * @param {string} dist  directory with the built site
 * @param {string} site  the `site` from astro.config.mjs
 * @returns {{ errors: string[], links: number, pages: number }}
 */
export function checkLinks(dist, site) {
  const origin = new URL(site).origin;
  const errors = [];
  let links = 0;
  let pages = 0;

  for (const file of htmlFiles(dist)) {
    pages++;
    const html = readFileSync(file, "utf8");
    const seen = new Set();

    for (const [, attr, dq, sq] of html.matchAll(ATTR)) {
      const path = internalPath(dq ?? sq, origin);
      if (path === null) continue;
      const clean = path.split(/[?#]/)[0];
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      links++;

      const where = `${relative(dist, file)}: ${attr}="${clean}"`;
      const last = clean.slice(clean.lastIndexOf("/") + 1);
      const isFile = last.includes(".");

      if (!isFile && !clean.endsWith("/")) {
        errors.push(`${where} must end in "/"`);
        continue;
      }
      const target = join(dist, decodeURIComponent(clean), isFile ? "" : "index.html");
      if (!existsSync(target)) {
        errors.push(`${where} points to a missing ${isFile ? "file" : "page"}`);
      }
    }
  }

  return { errors, links, pages };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: config } = await import("../astro.config.mjs");
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  const { errors, links, pages } = checkLinks(dist, config.site);

  if (errors.length > 0) {
    console.error(`Broken internal links (${errors.length}):\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`Links OK: ${links} internal links in ${pages} pages.`);
}
