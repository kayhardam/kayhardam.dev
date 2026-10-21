// The share images: public/og-nl.png and public/og-en.png, 1200 × 630.
// After Coachboard's scripts/og-default.mjs (commit 88a58a4): navy, with what
// matters in the middle square (x 285–915), which WhatsApp shows on its own.
// Not an SVG through sharp, as there: librsvg doesn't read woff2, and here the
// card is the real one, with Barlow Condensed and the CSS of the site.
//
// One-off, on the Mac: `npm run build && node scripts/og-image.mjs`, then
// commit the two PNGs. Not part of the build: Workers Builds has no Chromium,
// and system-ui (the label on the card) differs per machine, so the image
// would too. Run it again when a share link in src/data/boards.ts, the
// board's label, the statement or the colours change.
//
// It reads dist/ without a server (page.route()), takes the card's label and
// court from the page without JavaScript (step 1, as the server renders it)
// and the statement from the hero, and screenshots them on a page of its own.
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const pages = { nl: "/", en: "/en/" };
const origin = "http://og.local";
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };

/** Serves dist/, and the composed image at /og.html. */
async function serve(page, html) {
  await page.route(`${origin}/**`, (route) => {
    let path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path === "/og.html") return route.fulfill({ body: html, contentType: "text/html" });
    if (path.endsWith("/")) path += "index.html";
    const file = join(dist, path);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: types[extname(file)] ?? "application/octet-stream" });
  });
}

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

if (!existsSync(join(dist, "index.html"))) {
  console.error("No dist/: run `npm run build` first.");
  process.exit(1);
}

const logo = readFileSync(join(dist, "favicon.svg"), "utf8").replace("<svg ", '<svg width="52" height="52" aria-hidden="true" ');
const browser = await chromium.launch();

for (const [lang, path] of Object.entries(pages)) {
  const source = readFileSync(join(dist, path, "index.html"), "utf8");
  const styles = [...source.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join("\n");

  const built = await browser.newPage({ javaScriptEnabled: false });
  await serve(built, "");
  await built.goto(origin + path);
  const head = await built.locator(".board-head").evaluate((e) => e.outerHTML);
  const court = await built.locator(".board-court").evaluate((e) => e.outerHTML);
  const site = await built.locator(".site-header .logo span").textContent();
  const statement = await built.locator(".statement").textContent();
  const lead = await built.locator(".statement .lead").textContent();
  await built.close();
  const rest = statement.slice(lead.length).trim();

  // The square: the logo and the card together in the middle of the height,
  // 1 px higher, because the logo's ring starts 2 px inside its SVG. Beside it
  // two bands of 253 px, 32 px from the square, with the statement as in the
  // hero: the first sentence light grey, the second white. 36 px fits the
  // longest word, HANDBALTRAINER. (235 px).
  // The letter-spacing is on the text only: the label KH in the SVG would
  // inherit it and read "K H" (scaled with the logo, 5.6 px extra).
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">${styles}
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: var(--color-navy); }
  .square { position: absolute; left: 285px; top: 0; width: 630px; height: 630px; box-sizing: border-box; padding-bottom: 2px;
    display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand span { font-family: var(--font-display); font-weight: 700; font-size: 34px; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--color-on-navy); }
  .card { width: 480px; }
  .card .board { padding: 16px; }
  .band { position: absolute; top: 0; width: 253px; height: 630px; display: flex; flex-direction: column; justify-content: center;
    font-family: var(--font-display); font-weight: 700; font-size: 36px; line-height: 0.95; text-transform: uppercase; }
  .left { left: 0; text-align: right; color: var(--color-on-navy-muted); }
  .right { left: 947px; color: var(--color-on-navy); }
</style></head><body>
  <div class="band left"><span>${escape(lead)}</span></div>
  <div class="square">
    <div class="brand">${logo}<span>${escape(site)}</span></div>
    <div class="card"><div class="board">${head}${court}</div></div>
  </div>
  <div class="band right"><span>${escape(rest)}</span></div>
</body></html>`;

  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await serve(page, html);
  await page.goto(`${origin}/og.html`);
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot();
  await page.close();

  // No palette: it halves the size, but the card's shadow could get bands.
  const out = fileURLToPath(new URL(`../public/og-${lang}.png`, import.meta.url));
  await sharp(shot).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
  console.log(`Wrote public/og-${lang}.png`);
}

await browser.close();
