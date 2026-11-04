import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

// The share image that scripts/og-image.mjs made from the built site: Kay's
// photo beside the KH logo, kayhardam.dev below them, one image for both languages.
describe("og.png", () => {
  const png = readFileSync(new URL("../public/og.png", import.meta.url));

  it("is a PNG of 1200 × 630, without an alpha channel or a palette", async () => {
    const { format, width, height, channels, hasAlpha, isPalette } = await sharp(png).metadata();
    expect({ format, width, height, channels, hasAlpha, isPalette }).toEqual({
      format: "png",
      width: 1200,
      height: 630,
      channels: 3,
      hasAlpha: false,
      isPalette: false,
    });
  });

  // The photo comes from the clean copy (src/assets/photo.test.ts); the PNG has none of a JPEG's metadata either.
  it("has no metadata: no EXIF, ICC, XMP or IPTC", async () => {
    const { exif, icc, xmp, iptc } = await sharp(png).metadata();
    expect({ exif, icc, xmp, iptc }).toEqual({ exif: undefined, icc: undefined, xmp: undefined, iptc: undefined });
  });

  it("is the page's colour at the corners and the sides, has the photo, the logo and the text, and all else in x 285–915", async () => {
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const hex = (x, y) => {
      const i = (y * info.width + x) * info.channels;
      return "#" + [...data.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    };
    for (const [x, y] of [[0, 0], [1199, 0], [0, 629], [1199, 629], [0, 315], [1199, 315], [600, 0], [600, 629]]) {
      expect(hex(x, y), `${x},${y}`).toBe("#FDFBF8");
    }
    // The photo on the left, with its ink-blue edge; the logo on the right: the
    // ink-blue player as in the header, above the label KH, and the ball, the
    // page's colour inside its ink-blue edge (phase 10).
    expect(hex(443, 270), "the photo").not.toBe("#FDFBF8");
    expect(hex(317, 270), "the photo's edge").toBe("#1E40AF");
    expect(hex(727, 230), "the logo").toBe("#1E40AF");
    expect(hex(839, 181), "the ball").toBe("#FDFBF8");
    expect(hex(878, 181), "the ball's edge").toBe("#1E40AF");
    // Between the two.
    expect(hex(598, 270)).toBe("#FDFBF8");
    // kayhardam.dev below them, dark.
    expect(hex(600, 470), "the text").toBe("#1F1A17");

    // The square WhatsApp shows compactly: no pixel outside it that isn't the page's colour.
    const outside = [];
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if ((x < 285 || x > 915) && hex(x, y) !== "#FDFBF8") outside.push(`${x},${y}`);
      }
    }
    expect(outside).toEqual([]);
  });
});
