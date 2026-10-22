import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { check, clean, iccDescription, MAX, strip } from "./clean-photo.mjs";

const SCRIPT = fileURLToPath(new URL("./clean-photo.mjs", import.meta.url));

/** The markers of a JPEG's segments before the image data (0xE0 is APP0, 0xFE a comment). */
function markers(jpeg) {
  const found = [];
  let i = 2;
  while (jpeg[i + 1] !== 0xda) {
    found.push(jpeg[i + 1]);
    i += 2 + jpeg.readUInt16BE(i + 2);
  }
  return found;
}

const isMetadata = (marker) => (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;

/** A JPEG with a comment segment right after the start of the image. */
function withComment(jpeg, text) {
  const body = Buffer.from(text, "latin1");
  const segment = Buffer.alloc(4);
  segment.writeUInt16BE(0xfffe, 0);
  segment.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), segment, body, jpeg.subarray(2)]);
}

const photo = (width, height = width) =>
  sharp({ create: { width, height, channels: 3, background: { r: 21, g: 128, b: 61 } } });

/** A minimal ICC profile with one tag: 'desc' with the given type and data. */
function icc(type, data) {
  const tag = Buffer.concat([Buffer.from(type, "latin1"), Buffer.alloc(4), data]);
  const profile = Buffer.alloc(132 + 12);
  profile.writeUInt32BE(1, 128);
  profile.write("desc", 132, "latin1");
  profile.writeUInt32BE(profile.length, 136);
  profile.writeUInt32BE(tag.length, 140);
  return Buffer.concat([profile, tag]);
}

/** Runs the script itself; returns its exit code and whether it wrote the copy. */
function run(source) {
  const dir = mkdtempSync(join(tmpdir(), "clean-photo-"));
  const input = join(dir, "original.jpg");
  const output = join(dir, "copy.jpg");
  writeFileSync(input, source);
  try {
    execFileSync(process.execPath, [SCRIPT, input, output], { stdio: "pipe" });
    return { code: 0, written: existsSync(output), stderr: "" };
  } catch (error) {
    return { code: error.status, written: existsSync(output), stderr: String(error.stderr) };
  }
}

describe("clean()", () => {
  it("takes out EXIF (with GPS and a date), the ICC profile and the comment, and keeps the pixels", async () => {
    const jpeg = withComment(
      await photo(64)
        .withIccProfile("srgb")
        .withExif({
          IFD0: { DateTime: "2025:09:28 09:54:14" },
          IFD3: { GPSLatitudeRef: "N", GPSLatitude: "52/1 5/1 0/1" },
        })
        .jpeg()
        .toBuffer(),
      "a comment",
    );
    const before = await sharp(jpeg).metadata();
    expect(before.exif).toBeDefined();
    expect(before.icc).toBeDefined();
    // EXIF (APP1), ICC (APP2) and the comment (COM): sharp reports no comments in a JPEG.
    expect(markers(jpeg)).toEqual(expect.arrayContaining([0xe1, 0xe2, 0xfe]));

    const copy = await clean(jpeg);
    expect(markers(copy).filter(isMetadata)).toEqual([]);
    const after = await sharp(copy).metadata();
    expect([after.exif, after.icc, after.xmp, after.iptc, after.comments]).toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(Buffer.compare(await sharp(copy).raw().toBuffer(), await sharp(jpeg).raw().toBuffer())).toBe(0);
  });

  it(`makes a square larger than ${MAX} px ${MAX} px, without metadata`, async () => {
    const copy = await clean(await photo(1200).withIccProfile("srgb").jpeg().toBuffer());
    const { width, height, exif, icc } = await sharp(copy).metadata();
    expect({ width, height, exif, icc }).toEqual({ width: MAX, height: MAX, exif: undefined, icc: undefined });
    expect(markers(copy).filter(isMetadata)).toEqual([]);
  });

  it("leaves a JPEG without metadata as it is", async () => {
    const jpeg = await photo(64).jpeg().toBuffer();
    expect(Buffer.compare(await clean(jpeg), jpeg)).toBe(0);
  });
});

describe("check(): stops when a person has to do something first", () => {
  it("not square", async () => {
    await expect(check(await photo(400, 300).jpeg().toBuffer())).rejects.toThrow("not square (400 × 300)");
  });

  it("a colour profile that is not sRGB (Display P3)", async () => {
    await expect(check(await photo(64).withIccProfile("p3").jpeg().toBuffer())).rejects.toThrow("is not sRGB");
  });

  it("an EXIF orientation that is not 1", async () => {
    await expect(check(await photo(64).withMetadata({ orientation: 6 }).jpeg().toBuffer())).rejects.toThrow("orientation is 6");
  });

  it("not a JPEG", async () => {
    await expect(check(await photo(64).png().toBuffer())).rejects.toThrow("not a JPEG but png");
  });

  it("CMYK", async () => {
    await expect(check(await photo(64).toColourspace("cmyk").jpeg().toBuffer())).rejects.toThrow("colour space cmyk is not sRGB");
  });

  it("passes the photo of a square sRGB JPEG", async () => {
    await expect(check(await photo(64).withIccProfile("srgb").jpeg().toBuffer())).resolves.toEqual({ width: 64 });
  });
});

describe("the script", () => {
  it("writes the clean copy", async () => {
    const { code, written } = run(await photo(64).withIccProfile("srgb").jpeg().toBuffer());
    expect({ code, written }).toEqual({ code: 0, written: true });
  });

  it("writes nothing when it stops", async () => {
    for (const source of [
      await photo(400, 300).jpeg().toBuffer(),
      await photo(64).withIccProfile("p3").jpeg().toBuffer(),
      await photo(64).withMetadata({ orientation: 6 }).jpeg().toBuffer(),
    ]) {
      const { code, written, stderr } = run(source);
      expect({ code, written }).toEqual({ code: 1, written: false });
      expect(stderr).toMatch(/not square|not sRGB|orientation is 6/);
    }
  });
});

describe("iccDescription()", () => {
  const v2 = () => {
    const text = Buffer.from("sRGB IEC61966-2.1\0", "latin1");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(text.length);
    return icc("desc", Buffer.concat([length, text]));
  };
  const v4 = () => {
    const text = Buffer.from("Display P3", "utf16le").swap16();
    const record = Buffer.alloc(20);
    record.writeUInt32BE(1, 0); // one record
    record.writeUInt32BE(12, 4); // of 12 bytes
    record.write("enUS", 8, "latin1");
    record.writeUInt32BE(text.length, 12);
    record.writeUInt32BE(28, 16); // the text right after the record, from the start of the tag
    return icc("mluc", Buffer.concat([record, text]));
  };

  it("reads 'desc' (v2)", () => {
    expect(iccDescription(v2())).toBe("sRGB IEC61966-2.1");
  });

  it("reads 'mluc' (v4), also twice in a row", () => {
    const profile = v4();
    expect(iccDescription(profile)).toBe("Display P3");
    expect(iccDescription(profile)).toBe("Display P3");
  });

  it("reads the profiles sharp writes", async () => {
    for (const [name, pattern] of [["srgb", /sRGB/], ["p3", /P3/]]) {
      const { icc } = await sharp(await photo(8).withIccProfile(name).jpeg().toBuffer()).metadata();
      expect(iccDescription(icc)).toMatch(pattern);
      expect(iccDescription(icc)).toBe(iccDescription(icc));
    }
  });
});

describe("strip()", () => {
  it("throws on something that is not a JPEG", () => {
    expect(() => strip(Buffer.from([0xff, 0xd8, 0x00, 0x00, 0x00, 0x00]))).toThrow("not a valid JPEG");
  });
});

