// The share image: public/og.png, 1200 × 630, one for both languages.
// After Coachboard's scripts/og-default.mjs (commit 88a58a4): navy, with what
// matters in the middle square (x 285–915), which WhatsApp shows on its own.
// Not an SVG through sharp, as there: librsvg doesn't read woff2.
//
// One-off, on the Mac: `npm run build && node scripts/og-image.mjs`, then
// commit the PNG. Not part of the build: Workers Builds has no Chromium, and
// system-ui (the label KH) differs per machine, so the image would too. Run it
// again only when the logo, the colours or the font change.
//
// Stacked in the middle: the KH logo as in the header (the player from
// public/favicon.svg, white with a navy label) of 210 px, and 34 px
// below it KAYHARDAM.DEV as in the header, 64 px. It reads dist/ without a
// server (page.route()) for the site's CSS and fonts. The text is placed by its
// ink, not its line box: first measured on its own, so the group of pixels that
// aren't navy has equal margins, top and bottom, left and right.
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const origin = "http://og.local";
const types = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const [WIDTH, HEIGHT, LOGO, GAP] = [1200, 630, 210, 34];
const NAVY = [0x0f, 0x17, 0x2a];

if (!existsSync(join(dist, "index.html"))) {
  console.error("No dist/: run `npm run build` first.");
  process.exit(1);
}

/** The box of the pixels that aren't navy: left, top, right and bottom, inclusive. */
async function ink(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let [left, top, right, bottom] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      if (data[i] === NAVY[0] && data[i + 1] === NAVY[1] && data[i + 2] === NAVY[2]) continue;
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
// The letter-spacing is on the text only: the label KH in the SVG would inherit it and read "K H".
// The logo as in the header: the favicon's player, white with a navy label.
const logo = readFileSync(join(dist, "favicon.svg"), "utf8")
  .replace('<circle r="9" fill="#0F172A"', '<circle r="9" fill="#F8FAFC"')
  .replace('<text y="0.5" fill="#FFFFFF"', '<text y="0.5" fill="#0F172A"')
  .replace("<svg ", `<svg width="${LOGO}" height="${LOGO}" aria-hidden="true" `);

const page = (body) => `<!doctype html><html lang="nl"><head><meta charset="utf-8">${styles}
<style>
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: var(--color-navy); }
  body > * { position: absolute; }
  .site { font-family: var(--font-display); font-weight: 700; font-size: 64px; line-height: 1; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--color-on-navy); white-space: nowrap; }
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

const top = Math.round((HEIGHT - (LOGO + GAP + text.height)) / 2);
const textLeft = Math.round((WIDTH - text.width) / 2);
const shot = await shoot(
  `<div style="left: ${(WIDTH - LOGO) / 2}px; top: ${top}px; line-height: 0">${logo}</div>` +
    `<span class="site" style="left: ${textLeft - text.dx}px; top: ${top + LOGO + GAP - text.dy}px">${site}</span>`,
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
