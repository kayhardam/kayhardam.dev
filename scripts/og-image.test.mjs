import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

// The share images that scripts/og-image.mjs made from the built site.
for (const lang of ["nl", "en"]) {
  describe(`og-${lang}.png`, () => {
    const png = readFileSync(new URL(`../public/og-${lang}.png`, import.meta.url));

    it("is a PNG of 1200 × 630, without an alpha channel", async () => {
      const { format, width, height, channels, hasAlpha } = await sharp(png).metadata();
      expect({ format, width, height, channels, hasAlpha }).toEqual({ format: "png", width: 1200, height: 630, channels: 3, hasAlpha: false });
    });

    it("is navy at the corners and the sides, the white card in the middle", async () => {
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      const hex = (x, y) => {
        const i = (y * info.width + x) * info.channels;
        return "#" + [...data.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
      };
      // Not the middle of the bottom edge: the card's soft shadow reaches it.
      for (const [x, y] of [[0, 0], [1199, 0], [0, 629], [1199, 629], [0, 315], [1199, 315]]) expect(hex(x, y), `${x},${y}`).toBe("#0F172A");
      // The card's white edge, inside the square of x 285–915.
      expect(hex(370, 180)).toBe("#FFFFFF");
    });
  });
}
