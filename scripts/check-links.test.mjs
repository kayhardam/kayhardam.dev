// From Coachboard, scripts/check-links.test.mjs at commit 4ceafd4 (15 October 2026), unchanged.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkLinks } from "./check-links.mjs";

const site = "https://example.com";
let dist;

function build(files) {
  dist = mkdtempSync(join(tmpdir(), "check-links-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, path)), { recursive: true });
    writeFileSync(join(dist, path), content);
  }
  return checkLinks(dist, site);
}

afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe("checkLinks", () => {
  it("accepts existing pages and files, ignoring query, hash and external links", () => {
    const { errors, links } = build({
      "en/index.html": `
        <link rel="canonical" href="https://example.com/en/">
        <meta property="og:image" content="https://example.com/og.png">
        <a href="/en/privacy/#cookies">x</a>
        <a href="/en/privacy/?ref=nav">x</a>
        <a href="#main">x</a>
        <a href="https://other.example/page">x</a>
        <a href="//cdn.example/x.js">x</a>
        <img src='/og.png'>`,
      "en/privacy/index.html": "",
      "og.png": "",
    });
    expect(errors).toEqual([]);
    expect(links).toBe(3);
  });

  it("fails on a page link without a trailing slash", () => {
    const { errors } = build({
      "en/index.html": `<a href="/en/privacy">x</a>`,
      "en/privacy/index.html": "",
    });
    expect(errors).toEqual([`en/index.html: href="/en/privacy" must end in "/"`]);
  });

  it("fails on a missing page, file or own-origin URL", () => {
    const { errors } = build({
      "en/index.html": `
        <a href="/en/board/">x</a>
        <link rel="icon" href="/favicon.svg">
        <meta property="og:image" content="https://example.com/og-default.png">
        <a href="/">x</a>`,
    });
    expect(errors).toEqual([
      `en/index.html: href="/en/board/" points to a missing page`,
      `en/index.html: href="/favicon.svg" points to a missing file`,
      `en/index.html: content="/og-default.png" points to a missing file`,
      `en/index.html: href="/" points to a missing page`,
    ]);
  });
});
