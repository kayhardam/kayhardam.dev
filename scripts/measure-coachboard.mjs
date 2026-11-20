// Measures the touch targets of Coachboard's editor, for the lens on the home
// page (Hars, 15 November 2026): Kay wants the real sizes, never made up.
//
//   node scripts/measure-coachboard.mjs <url of a Coachboard build>
//
// Run it against Coachboard built at the commit below, served the way production
// serves it. In the Coachboard repo, in a worktree of its own (another session may
// be working in the repo itself):
//   git worktree add --detach ../cb-03be23b 03be23bea71d6bffa37d5af567b88376d3d592cc
//   cd ../cb-03be23b && npm ci && npm run build
//   npx wrangler dev --ip 127.0.0.1 --port 8790
//   node <this repo>/scripts/measure-coachboard.mjs http://127.0.0.1:8790
// CHROMIUM_PATH points it at another Chromium than Playwright's own.
//
// For each language it opens the editor (/nl/board/, /en/board/) in a phone's
// window of 393 × 659 (an iPhone 15 in Safari, as Coachboard's own measurements),
// on a new board: the default lineup, as a first visit sees it. It writes:
// - src/assets/coachboard-editor-<lang>.png: the screenshot, at twice the size;
// - src/data/tap-targets.json: per language, every touch target on that screen,
//   in CSS pixels of the window: the visible links and buttons (a closed menu's
//   items are not visible) by their accessible name and box, and the players and
//   the ball by the area a tap really reaches them in, named by their label, or
//   by the name of their kind in the editor's kind bar.
//
// A piece's area follows Coachboard's own rule (src/lib/board/hit.ts at the commit
// below): a tap goes to the nearest piece within its reach, max(HIT_R, 22 px),
// drawn as the transparent circle round each piece. Where two circles overlap the
// nearer piece wins, so the area is the circle cut off by the line halfway to each
// neighbour, and by the edge of the court's SVG. It is kept as a polygon (`points`,
// 32 to a circle) with its box, and `size`: its smallest width through the piece,
// as Coachboard's docs/metingen.md measures a tap area: the circle's diameter, or
// the distance to the nearest neighbour, or twice the distance to the edge.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

export const COMMIT = "03be23bea71d6bffa37d5af567b88376d3d592cc";
export const VIEWPORT = { width: 393, height: 659 };
const LANGS = ["nl", "en"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const round = (v) => Math.round(v * 10) / 10;

/** Every touch target on the editor's first screen, in the page. */
function targets() {
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    return el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  };
  // Its accessible name; for a button that shows only a number (the step "1"), its title ("Stap 1").
  const name = (el) => {
    const text = (el.getAttribute("aria-label") || el.querySelector(".label")?.textContent || el.textContent || "").replace(/\s+/g, " ").trim();
    return /^\d+$/.test(text) && el.title ? el.title : text;
  };
  const controls = [...document.querySelectorAll("a[href], button, summary, input, select, textarea, [role=button]")]
    .filter(shown)
    .map((el) => ({ name: name(el), kind: el.tagName === "A" ? "link" : "button", shape: "rect", rect: el.getBoundingClientRect() }));
  // The kind bar's names, for the pieces without a label: the last six buttons
  // (Move, Arrow, Attack, Defender, Ball, Cone).
  const bar = controls.filter((c) => c.kind === "button").slice(-6).map((c) => c.name);
  const kinds = { a: bar[2], d: bar[3], ball: bar[4] };
  const svg = document.querySelector('svg:has([data-kind="player"])');
  const edge = svg.getBoundingClientRect();
  const pieces = [...svg.querySelectorAll('[data-kind="player"], [data-kind="ball"]')].map((g) => {
    const hit = g.querySelector('circle[fill="transparent"]').getBoundingClientRect();
    const team = g.querySelector('circle[fill="#15803d"]') ? "a" : "d";
    const kind = g.getAttribute("data-kind");
    const label = g.querySelector("text")?.textContent?.trim();
    return {
      name: kind === "ball" ? kinds.ball : label || kinds[team],
      kind: kind === "ball" ? "ball" : "player",
      c: [hit.x + hit.width / 2, hit.y + hit.height / 2],
      r: hit.width / 2,
    };
  });
  /** Keeps the part of `poly` where `inside` holds (Sutherland–Hodgman), cutting each edge at `cut`. */
  const clip = (poly, inside, cut) =>
    poly.flatMap((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const [a, b] = [inside(p), inside(q)];
      return a && b ? [q] : a ? [cut(p, q)] : b ? [cut(p, q), q] : [];
    });
  const areas = pieces.map((piece) => {
    // The circle, as 32 points, then cut by the line halfway to each neighbour within reach.
    let poly = Array.from({ length: 32 }, (_, i) => [piece.c[0] + piece.r * Math.cos((i * Math.PI) / 16), piece.c[1] + piece.r * Math.sin((i * Math.PI) / 16)]);
    for (const other of pieces) {
      if (other === piece || Math.hypot(other.c[0] - piece.c[0], other.c[1] - piece.c[1]) >= 2 * piece.r) continue;
      // Nearer to `piece` than to `other`: on piece's side of their bisector.
      const n = [other.c[0] - piece.c[0], other.c[1] - piece.c[1]];
      const m = [(piece.c[0] + other.c[0]) / 2, (piece.c[1] + other.c[1]) / 2];
      const side = (p) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
      poly = clip(poly, (p) => side(p) <= 0, (p, q) => {
        const t = side(p) / (side(p) - side(q));
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      });
    }
    // And the SVG's own box: outside it a tap is not on the court.
    for (const [axis, bound, keep] of [[0, edge.left, 1], [0, edge.right, -1], [1, edge.top, 1], [1, edge.bottom, -1]]) {
      poly = clip(poly, (p) => (p[axis] - bound) * keep >= 0, (p, q) => {
        const t = (bound - p[axis]) / (q[axis] - p[axis]);
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      });
    }
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const rect = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    const [cx, cy] = piece.c;
    const size = Math.min(
      2 * piece.r,
      ...pieces.filter((o) => o !== piece).map((o) => Math.hypot(o.c[0] - cx, o.c[1] - cy)),
      2 * (cx - edge.left),
      2 * (edge.right - cx),
      2 * (cy - edge.top),
      2 * (edge.bottom - cy),
    );
    return { name: piece.name, kind: piece.kind, shape: "area", rect, points: poly, size };
  });
  return [...controls, ...areas].map(({ name, kind, shape, rect, points, size }) => ({
    name,
    kind,
    shape,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    ...(points ? { size, points } : {}),
  }));
}

async function main(base) {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const out = { source: { repo: "kayhardam/coachboard", commit: COMMIT, viewport: VIEWPORT, measured: new Date().toISOString().slice(0, 10) } };
  for (const lang of LANGS) {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    await page.goto(`${base}/${lang}/board/`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('svg [data-kind="player"]').first().waitFor();
    await page.waitForTimeout(500);
    const list = (await page.evaluate(targets)).map((t) => ({
      ...t,
      x: round(t.x),
      y: round(t.y),
      width: round(t.width),
      height: round(t.height),
      ...(t.points ? { size: round(t.size), points: t.points.map(([x, y]) => [round(x), round(y)]) } : {}),
    }));
    if (!list.length || list.some((t) => !t.name)) throw new Error(`A target without a name on /${lang}/board/`);
    const png = join(root, "src/assets", `coachboard-editor-${lang}.png`);
    mkdirSync(dirname(png), { recursive: true });
    await page.screenshot({ path: png });
    out[lang] = { page: `/${lang}/board/`, targets: list };
    await page.close();
    console.log(`/${lang}/board/: ${list.length} targets, ${png}`);
  }
  await browser.close();
  // Indented, but a target on one line, so a change reads well in a diff.
  const json = JSON.stringify(out, (key, value) => (Array.isArray(value) && key === "targets" ? value.map((t) => JSON.stringify(t)) : value), 2)
    .replace(/"(\{.*\})"/g, (_, t) => JSON.parse(`"${t}"`));
  writeFileSync(join(root, "src/data/tap-targets.json"), `${json}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = process.argv[2];
  if (!base) {
    console.error("Usage: node scripts/measure-coachboard.mjs <url of a Coachboard build at 03be23b>");
    process.exit(1);
  }
  await main(base.replace(/\/$/, ""));
}
