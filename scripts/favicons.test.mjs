import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

// The icons that scripts/favicons.mjs made from public/favicon.svg.
const read = (name) => readFileSync(new URL(`../public/${name}`, import.meta.url));

/** Width, height and colour type from a PNG's IHDR. */
function ihdr(png) {
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.subarray(12, 16).toString()).toBe("IHDR");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), colourType: png[25] };
}

describe("favicon.ico", () => {
  it("is an icon with a PNG of 16 and of 32 px", () => {
    const ico = read("favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    const count = ico.readUInt16LE(4);
    const sizes = [];
    for (let i = 0; i < count; i++) {
      const entry = 6 + 16 * i;
      const length = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      const { width, height } = ihdr(ico.subarray(offset, offset + length));
      expect([ico[entry], ico[entry + 1]]).toEqual([width, height]);
      sizes.push(width);
    }
    expect(sizes).toEqual([16, 32]);
  });
});

describe("apple-touch-icon.png", () => {
  const png = read("apple-touch-icon.png");

  it("is 180 × 180, without an alpha channel", () => {
    // Colour type 2 is RGB; 6 would be RGB with alpha.
    expect(ihdr(png)).toEqual({ width: 180, height: 180, colourType: 2 });
  });

  it("is navy at the corners and the edges, green in the middle", async () => {
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const hex = (x, y) => {
      const i = (y * info.width + x) * info.channels;
      return "#" + [...data.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    };
    const edge = [[0, 0], [179, 0], [0, 179], [179, 179], [90, 0], [0, 90], [179, 90], [90, 179]];
    for (const [x, y] of edge) expect(hex(x, y), `${x},${y}`).toBe("#0F172A");
    // Just above the middle: between the letters K and H there is green too, but not on every pixel.
    expect(hex(90, 45)).toBe("#15803D");
  });
});

describe("favicon.svg", () => {
  it("is the player with radius 9 in #15803D and the label KH", () => {
    const svg = read("favicon.svg").toString();
    expect(svg).toMatch(/<circle r="9" fill="#15803D"/);
    expect(svg).toMatch(/>KH<\/text>/);
  });
});
