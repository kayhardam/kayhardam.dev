// Makes the clean copy of a photo for the site: the JPEG without its metadata.
//   node scripts/clean-photo.mjs "screenshots/foto/<original>.jpg" src/assets/kay-hardam.jpg
// One-off, like og-image.mjs: run it again for a new photo, then commit the copy.
//
// - Every APP1 to APP15 segment (EXIF, XMP, ICC, IPTC, Adobe, …) and every
//   comment goes; JFIF (APP0) and the image data stay as they are, so the
//   pixels don't change. Without its profile a JPEG shows as sRGB.
// - A square photo larger than 900 px (3 × 300) becomes 900 px: that is the
//   one case where it compresses again (JPEG, quality 90, without metadata).
// - It never changes a photo unnoticed: it stops, and writes nothing, when a
//   person has to do something first (crop, turn upright, convert to sRGB).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

/** The largest size: three times the 300 px on the page. */
export const MAX = 900;

/** The description in an ICC profile: a 'desc' tag (v2, ASCII) or 'mluc' (v4, UTF-16BE). */
export function iccDescription(icc) {
  const count = icc.readUInt32BE(128);
  for (let i = 0; i < count; i++) {
    const at = 132 + i * 12;
    if (icc.toString("latin1", at, at + 4) !== "desc") continue;
    const offset = icc.readUInt32BE(at + 4);
    const type = icc.toString("latin1", offset, offset + 4);
    if (type === "desc") return icc.toString("latin1", offset + 12, offset + 12 + icc.readUInt32BE(offset + 8) - 1);
    if (type === "mluc") {
      const length = icc.readUInt32BE(offset + 20);
      const start = offset + icc.readUInt32BE(offset + 24);
      // A copy first: subarray() shares the memory, and swap16() would turn the profile itself around.
      return Buffer.from(icc.subarray(start, start + length)).swap16().toString("utf16le");
    }
  }
  return "";
}

/** Throws when the photo needs a person first: not a JPEG, not square, not upright, not sRGB. */
export async function check(input) {
  const { format, width, height, orientation, space, icc } = await sharp(input).metadata();
  if (format !== "jpeg") throw new Error(`not a JPEG but ${format}`);
  if (width !== height) throw new Error(`not square (${width} × ${height}): crop it first`);
  if (orientation !== undefined && orientation !== 1) {
    throw new Error(`EXIF orientation is ${orientation}, not 1: save it upright first`);
  }
  if (space !== "srgb") throw new Error(`colour space ${space} is not sRGB: convert it first`);
  if (icc) {
    const description = iccDescription(icc);
    if (!/sRGB/i.test(description)) throw new Error(`colour profile "${description}" is not sRGB: convert it to sRGB first`);
  }
  return { width };
}

/** The JPEG without APP1 to APP15 and comments; the image data stays untouched. */
export function strip(jpeg) {
  const keep = [jpeg.subarray(0, 2)];
  let i = 2;
  while (jpeg[i + 1] !== 0xda) {
    if (jpeg[i] !== 0xff || i + 4 > jpeg.length) throw new Error("not a valid JPEG: no image data found");
    const marker = jpeg[i + 1];
    const length = jpeg.readUInt16BE(i + 2);
    const metadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!metadata) keep.push(jpeg.subarray(i, i + 2 + length));
    i += 2 + length;
  }
  keep.push(jpeg.subarray(i));
  return Buffer.concat(keep);
}

/** The clean copy of a JPEG; throws (see check) when a person has to do something first. */
export async function clean(input) {
  const { width } = await check(input);
  if (width <= MAX) return strip(input);
  return sharp(input).resize(MAX, MAX, { kernel: "lanczos3" }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, target] = process.argv.slice(2);
  if (!source || !target) {
    console.error("Usage: node scripts/clean-photo.mjs <original.jpg> <copy.jpg>");
    process.exit(1);
  }
  try {
    const copy = await clean(readFileSync(source));
    writeFileSync(target, copy);
    const { width, height } = await sharp(copy).metadata();
    console.log(`${target}: ${width} × ${height}, ${copy.length} bytes, without metadata.`);
  } catch (error) {
    console.error(`${source}: ${error.message}`);
    process.exit(1);
  }
}
