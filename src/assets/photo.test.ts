import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

// The photo in About me: the clean copy from scripts/clean-photo.mjs. The original
// stays outside git (screenshots/foto/); only this copy goes to the build.
describe("src/assets/kay-hardam.jpg", () => {
  const jpeg = readFileSync(new URL("./kay-hardam.jpg", import.meta.url));

  it("is a square sRGB JPEG of 799 to 900 px", async () => {
    const { format, width, height, space, channels } = await sharp(jpeg).metadata();
    expect({ format, square: width === height, space, channels }).toEqual({ format: "jpeg", square: true, space: "srgb", channels: 3 });
    expect(width).toBeGreaterThanOrEqual(799);
    expect(width).toBeLessThanOrEqual(900);
  });

  it("has no EXIF, ICC, XMP or IPTC", async () => {
    const { exif, icc, xmp, iptc, orientation } = await sharp(jpeg).metadata();
    expect({ exif, icc, xmp, iptc, orientation }).toEqual({ exif: undefined, icc: undefined, xmp: undefined, iptc: undefined, orientation: undefined });
  });

  it("has no APPn segment but JFIF, and no comment", () => {
    const markers: number[] = [];
    let i = 2;
    while (jpeg[i + 1] !== 0xda) {
      markers.push(jpeg[i + 1]);
      i += 2 + jpeg.readUInt16BE(i + 2);
    }
    expect(markers.filter((m) => (m >= 0xe1 && m <= 0xef) || m === 0xfe)).toEqual([]);
  });
});
