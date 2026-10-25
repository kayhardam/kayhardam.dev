// After Coachboard's scripts/favicons.mjs (commit 4ceafd4). Only the
// apple-touch-icon is made differently: there is no tile to square off.
//
// Renders public/favicon.ico (16 and 32 px) and public/apple-touch-icon.png
// (180 px) from public/favicon.svg. One-off: run `node scripts/favicons.mjs`
// after editing the SVG, then commit the results.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url));
const png = (size, source = svg) => sharp(source, { density: 72 * (size / 32) * 4 }).resize(size, size).png().toBuffer();

// An .ico is a small directory of images; modern ones may hold PNGs as they are.
const images = await Promise.all([16, 32].map((size) => png(size)));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((image, i) => {
  const size = [16, 32][i];
  const entry = 6 + 16 * i;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4); // colour planes
  header.writeUInt16LE(32, entry + 6); // bits per pixel
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
writeFileSync(new URL("../public/favicon.ico", import.meta.url), Buffer.concat([header, ...images]));

// iOS rounds the corners itself and fills transparency with black: the
// player as in the header (white, with a navy label) on a navy square of 28
// by 28, so the player is 19/28 of the icon, and no alpha channel at all.
const navy = "#0F172A";
const square = Buffer.from(
  svg
    .toString()
    .replace(`<circle r="9" fill="${navy}"`, '<circle r="9" fill="#F8FAFC"')
    .replace('<text y="0.5" fill="#FFFFFF"', `<text y="0.5" fill="${navy}"`)
    .replace('viewBox="-9.5 -9.5 19 19"', 'viewBox="-14 -14 28 28"')
    .replace(/(<svg[^>]*>)/, `$1<rect x="-14" y="-14" width="28" height="28" fill="${navy}"/>`),
);
const touch = await sharp(square, { density: 72 * (180 / 32) * 4 })
  .resize(180, 180)
  .flatten({ background: navy })
  .removeAlpha()
  .png()
  .toBuffer();
writeFileSync(new URL("../public/apple-touch-icon.png", import.meta.url), touch);
console.log("Wrote public/favicon.ico and public/apple-touch-icon.png");
