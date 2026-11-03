// The share image: public/og.png, 1200 × 630, one for both languages.
// After Coachboard's scripts/og-default.mjs (commit 88a58a4): the page's colour,
// with what matters in the middle square (x 285–915), which WhatsApp shows on
// its own. Not an SVG through sharp, as there: librsvg doesn't read woff2.
//
// One-off: `npm run build && node scripts/og-image.mjs`, then commit the PNG.
// Not part of the build: Workers Builds has no Chromium. Since phase 10 the
// label KH is a path (public/favicon.svg) and the text is in the site's own
// font, so the image no longer depends on the machine's fonts. Run it again
// only when the photo, the logo, the colours or the font change.
//
// In the middle: Kay's photo of 260 px, round with an ink-blue edge of 8 px like
// the photo in About me, and 48 px beside it the KH logo as in the header: the
// ink-blue player from public/favicon.svg with the ball. The player is as large
// as before, 19 units in 210 px, so the logo's 24 × 22 units are 265 × 243 px;
// the player and the photo are centred on each other, the ball sticks out above.
// 34 px below them kayhardam.dev as in the header, 64 px. The photo is the clean
// copy, src/assets/kay-hardam.jpg; the PNG keeps none of its metadata
// (og-image.test.mjs). It reads dist/ without a server (page.route()) for the
// site's CSS and fonts. The text is placed by its ink, not its line box: first
// measured on its own, so the group of pixels that aren't the page's colour has
// equal margins, top and bottom, left and right.
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const origin = "http://og.local";
const types = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const [WIDTH, HEIGHT, PHOTO, EDGE, BESIDE, GAP] = [1200, 630, 260, 8, 48, 34];
/** Px per unit of the logo: the player, 19 units with its edge, is 210 px. */
const UNIT = 210 / 19;
/** The header's logo: its viewBox, the player around (0, 0), and the ball's top (y −12.45). */
const LOGO = { x: -9.5, y: -12.5, width: 24, height: 22, ballTop: -12.45 };
const [LOGO_W, LOGO_H] = [LOGO.width * UNIT, LOGO.height * UNIT];
/** How far the ball sticks out above the photo, with the player and the photo centred on each other. */
const ABOVE = -LOGO.ballTop * UNIT - PHOTO / 2;
const BG = [0xfd, 0xfb, 0xf8];

if (!existsSync(join(dist, "index.html"))) {
  console.error("No dist/: run `npm run build` first.");
  process.exit(1);
}

/** The box of the pixels that aren't the page's colour: left, top, right and bottom, inclusive. */
async function ink(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let [left, top, right, bottom] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      if (data[i] === BG[0] && data[i + 1] === BG[1] && data[i + 2] === BG[2]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom };
}

const source = readFileSync(join(dist, "index.html"), "utf8");
const styles = [...source.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join("\n");
const site = readFileSync(fileURLToPath(new URL("../src/i18n/nl.ts", import.meta.url)), "utf8").match(/site: "([^"]+)"/)[1];
// The logo as in the header: the favicon's player with the ball, in the header's viewBox.
const logo = readFileSync(join(dist, "favicon.svg"), "utf8")
  .replace('viewBox="-9.5 -9.5 19 19"', `viewBox="${LOGO.x} ${LOGO.y} ${LOGO.width} ${LOGO.height}" width="${LOGO_W}" height="${LOGO_H}" aria-hidden="true"`)
  .replace("</svg>", '<circle cx="10.2" cy="-8.2" r="3.4" fill="#FDFBF8" stroke="#1E40AF" stroke-width="1.7"/></svg>');
const photo = `data:image/jpeg;base64,${readFileSync(fileURLToPath(new URL("../src/assets/kay-hardam.jpg", import.meta.url))).toString("base64")}`;

const page = (body) => `<!doctype html><html lang="nl"><head><meta charset="utf-8">${styles}
<style>
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: var(--color-bg); }
  body > * { position: absolute; }
  .site { font-family: var(--font-sans); font-weight: 800; font-size: 64px; line-height: 1; letter-spacing: -0.01em;
    color: var(--color-text); white-space: nowrap; }
  .photo { width: ${PHOTO}px; height: ${PHOTO}px; border: ${EDGE}px solid var(--color-accent); border-radius: 50%; object-fit: cover; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
let html = "";
await tab.route(`${origin}/**`, (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  if (path === "/og.html") return route.fulfill({ body: html, contentType: "text/html" });
  const file = join(dist, path);
  if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({ body: readFileSync(file), contentType: types[extname(file)] ?? "application/octet-stream" });
});
async function shoot(body) {
  html = page(body);
  await tab.goto(`${origin}/og.html`);
  await tab.evaluate(() => document.fonts.ready);
  return tab.screenshot();
}

// The text on its own, at (100, 100): where its ink is, against its box.
const alone = await ink(await shoot(`<span class="site" style="left: 100px; top: 100px">${site}</span>`));
const text = { dx: alone.left - 100, dy: alone.top - 100, width: alone.right - alone.left + 1, height: alone.bottom - alone.top + 1 };

// The photo and the logo in a row, the text below it. `top` is the photo's top;
// the ball sticks out ABOVE it, and counts for the margins.
const top = Math.round((HEIGHT - (ABOVE + PHOTO + GAP + text.height)) / 2 + ABOVE);
const left = Math.round((WIDTH - (PHOTO + BESIDE + LOGO_W)) / 2);
const logoTop = top + PHOTO / 2 + LOGO.y * UNIT;
const textLeft = Math.round((WIDTH - text.width) / 2);
const shot = await shoot(
  `<img class="photo" src="${photo}" alt="" style="left: ${left}px; top: ${top}px">` +
    `<div style="left: ${left + PHOTO + BESIDE}px; top: ${logoTop}px; line-height: 0">${logo}</div>` +
    `<span class="site" style="left: ${textLeft - text.dx}px; top: ${top + PHOTO + GAP - text.dy}px">${site}</span>`,
);
await browser.close();

// No alpha and no palette, as before.
const out = fileURLToPath(new URL("../public/og.png", import.meta.url));
await sharp(shot).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
const box = await ink(readFileSync(out));
console.log(
  `Wrote public/og.png: ink x ${box.left}–${box.right}, y ${box.top}–${box.bottom};`,
  `margins left ${box.left}, right ${WIDTH - 1 - box.right}, top ${box.top}, bottom ${HEIGHT - 1 - box.bottom}`,
);
