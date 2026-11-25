// "Van zaal naar bord" (Kay, 25 November 2026): the landing page's opening as a 3D scene, drawn by
// one number t from 0 to 1, the scroll through the opening. The attack "Kruising MO–LO" from
// Coachboard's library in a sports hall: RO passes to MO, CL runs to the 6 metres, LO crosses
// behind MO, gets the ball back, runs on and shoots, and the defence moves with the ball. Then
// the players sink into their discs, the camera rises and the hall becomes the Coachboard drawing
// of that attack, over which the page fades in the real one (Court.svelte).
//
// The court is in metres, x from -10 to 10 and z from the goal line, from Coachboard's decimetres
// (dm). Colours: colours.ts. The step windows (PH) are the ones the page's captions use
// (Landing.astro). Nothing here runs by itself: render(t) draws one moment, when the scroll moves.
import * as THREE from "three";
import { END, SCENE, css } from "./colours";

/** Position labels in the order of the lineup: LH, LO, MO, RO, RH, CL and K in Dutch. */
export type Labels = readonly [string, string, string, string, string, string, string];

export interface SceneOptions {
  labels: Labels;
  /** The scoreboard's two teams, e.g. "Thuis" and "Uit". */
  home: string;
  away: string;
}

/** Where the board's drawing lies over the canvas, in CSS px from its top left: the box of Court.svelte's viewBox -8 -14 216 174. */
export interface BoardBox {
  left: number;
  top: number;
  width: number;
}

export interface Scene {
  /** Draws the moment t, from 0 (the start) to 1 (the board). */
  render(t: number): void;
  /** The canvas's size in CSS px, and where the board lies over it: the camera ends exactly on it. */
  resize(width: number, height: number, board: BoardBox): void;
  dispose(): void;
}

// ---------- the timeline ----------
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const smooth = (u: number) => {
  const v = Math.min(1, Math.max(0, u));
  return v * v * (3 - 2 * v);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** The steps of the attack, as windows of t. The captions on the page use the same. */
const PH = { mo: [0.08, 0.27], cl: [0.1, 0.3], ro: [0.19, 0.28], lo1: [0.3, 0.45], back: [0.45, 0.52], lo2: [0.52, 0.61], F: [0.61, 0.73] } as const;
type Phase = keyof typeof PH;
const SECONDS = 9; // the whole scroll as time, for the dribble and breathing
const v2 = (x: number, y: number) => new THREE.Vector2(x, y);
/** Board decimetres to metres on the court: (X, Z). */
const dm = (x: number, y: number) => v2(x / 10 - 10, y / 10);

/** Where the lineup stands at the start, in Coachboard's decimetres: the tactic's first step (src/data/opening.ts). */
export const LINEUP: readonly (readonly [number, number])[] = [
  [8, 48], [30, 118], [100, 130], [170, 118], [192, 48], [100, 66], [100, 8],
  [22, 30], [48, 58], [80, 66], [120, 66], [152, 58], [178, 30],
];

// ---------- the attack: every arrow of the tactic's four steps ----------
const P = {
  MO0: dm(100, 130), MO1: dm(66, 94),
  LO0: dm(30, 118), LOb: dm(62, 126), LO1: dm(88, 112), LO2: dm(88, 94),
  RO0: dm(170, 118),
  CL0: dm(100, 66), CLb: dm(124, 88), CL1: dm(138, 76),
  shotEnd: dm(110, 0),
};
type Path = (u: number) => THREE.Vector2;
interface Move {
  f: Path;
  kind: "run" | "pass" | "shot";
  n?: number;
}
/** A curve through the bend halfway, as Coachboard draws an arrow with a bend. */
const through = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2): Path => {
  const k = b.clone().multiplyScalar(2).sub(a.clone().add(c).multiplyScalar(0.5));
  return (u) => v2((1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * k.x + u * u * c.x, (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * k.y + u * u * c.y);
};
const line = (a: THREE.Vector2, b: THREE.Vector2): Path => (u) => a.clone().lerp(b, u);
const sample = (f: Path, n: number) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const MOVES = {
  cl: { f: through(P.CL0, P.CLb, P.CL1), kind: "run", n: 40 },
  mo: { f: line(P.MO0, P.MO1), kind: "run" },
  ro: { f: line(P.RO0, P.MO1), kind: "pass" },
  lo1: { f: through(P.LO0, P.LOb, P.LO1), kind: "run", n: 40 },
  back: { f: line(P.MO1, P.LO1), kind: "pass" },
  lo2: { f: line(P.LO1, P.LO2), kind: "run" },
  shot: { f: line(P.LO2, P.shotEnd), kind: "shot" },
} satisfies Record<string, Move>;

/** Where the camera looks during the play, [t, x, z]: it follows the ball. */
const KEYS: readonly (readonly [number, number, number])[] = [
  [0.0, 0.6, 12.8], [0.08, 0.6, 12.6], [0.28, -2.2, 10.6], [0.45, -2.2, 10.9],
  [0.52, -1.6, 10.8], [0.61, -1.0, 9.8], [0.72, -0.4, 8.2],
];
/**
 * The 6-0 defence moves with the ball and shields CL, [t, x, z]. The ball starts with RO: D11
 * steps out to him and the line leans right. MO goes at the goal and gets the ball, so D9 has to
 * step out to him (the tactic's first coaching point). CL runs to the 6 metres on the right: D10
 * goes with him and stays in front of him, D11 behind. That leaves room in the middle, between D9
 * and D10: LO runs on into it and shoots.
 */
const DEF: Record<"D7" | "D8" | "D9" | "D10" | "D11" | "D12", readonly (readonly [number, number, number])[]> = {
  D7: [[0, -7.8, 3.0], [0.08, -7.6, 3.1], [0.3, -7.8, 3.2], [0.45, -7.9, 3.3]],
  D8: [[0, -5.2, 5.8], [0.08, -5.0, 5.9], [0.3, -4.6, 6.4], [0.45, -4.5, 6.6], [0.52, -4.1, 6.4], [0.7, -3.7, 6.3]],
  D9: [[0, -2.0, 6.6], [0.08, -1.8, 6.6], [0.3, -2.9, 8.0], [0.45, -3.0, 8.1], [0.52, -2.6, 7.8], [0.61, -2.1, 7.5], [0.7, -1.9, 7.3]],
  D10: [[0, 2.0, 6.6], [0.08, 2.4, 6.7], [0.3, 3.0, 7.8], [0.45, 3.0, 7.8], [0.52, 2.6, 7.9], [0.61, 1.6, 7.9], [0.7, 1.1, 7.7]],
  D11: [[0, 5.2, 5.8], [0.08, 6.0, 7.2], [0.3, 4.9, 6.5], [0.45, 4.9, 6.5], [0.52, 4.6, 6.5], [0.7, 4.3, 6.5]],
  D12: [[0, 7.8, 3.0], [0.08, 7.6, 3.4], [0.3, 7.4, 3.3]],
};

/** A path through keyframes [t, x, z]: where it is at t, how far it has come, and whether it moves. */
function track(keys: readonly (readonly [number, number, number])[], t: number) {
  let dist = 0;
  const [first] = keys;
  if (t <= first![0]) return { pos: v2(first![1], first![2]), dist: 0, moving: 0 };
  for (let i = 1; i < keys.length; i++) {
    const [t0, x0, z0] = keys[i - 1]!;
    const [t1, x1, z1] = keys[i]!;
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (t <= t1) {
      const u = smooth((t - t0) / (t1 - t0));
      return { pos: v2(lerp(x0, x1, u), lerp(z0, z1, u)), dist: dist + len * u, moving: len > 0.05 ? Math.sin(Math.PI * ((t - t0) / (t1 - t0))) : 0 };
    }
    dist += len;
  }
  const last = keys[keys.length - 1]!;
  return { pos: v2(last[1], last[2]), dist, moving: 0 };
}

/** Where the camera looks at t during the play, smoothly. */
function focusAt(t: number) {
  for (let i = 1; i < KEYS.length; i++) {
    const [t0, x0, z0] = KEYS[i - 1]!;
    const [t1, x1, z1] = KEYS[i]!;
    if (t <= t1) {
      const u = smooth(Math.max(0, (t - t0) / (t1 - t0)));
      return v2(lerp(x0, x1, u), lerp(z0, z1, u));
    }
  }
  const last = KEYS[KEYS.length - 1]!;
  return v2(last[1], last[2]);
}

const headingTo = (from: THREE.Vector2, to: THREE.Vector2) => Math.atan2(-(to.x - from.x), -(to.y - from.y));
const angLerp = (a: number, b: number, u: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * u;
};

/** A flat ribbon along points (X, Z) on the floor. */
function ribbonGeometry(pts: THREE.Vector2[], width: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const d = v2(b.x - a.x, b.y - a.y).normalize();
    const nx = -d.y * (width / 2);
    const nz = d.x * (width / 2);
    const p = pts[i]!;
    pos.push(p.x + nx, 0, p.y + nz, p.x - nx, 0, p.y - nz);
    if (i > 0) {
      const k = (i - 1) * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Cuts points into dashes of `dash` metres with `gap` between. */
function dashes(pts: THREE.Vector2[], dash: number, gap: number) {
  const out: THREE.Vector2[][] = [];
  let along = 0;
  let cur: THREE.Vector2[] = [];
  const on = (s: number) => s % (dash + gap) < dash;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = a.distanceTo(b);
    const steps = Math.max(1, Math.ceil(len / 0.05));
    for (let k = 0; k < steps; k++) {
      const p = a.clone().lerp(b, k / steps);
      if (on(along + (len * k) / steps)) cur.push(p);
      else if (cur.length) {
        if (cur.length > 1) out.push(cur);
        cur = [];
      }
    }
    along += len;
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

/** A canvas with its 2D context, for a texture. */
function canvas2d(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, g: c.getContext("2d")! };
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The number on a shirt's back. */
function labelTexture(text: string, color: string, ink: string) {
  const s = 512;
  const { c, g } = canvas2d(s, s);
  g.fillStyle = color;
  g.fillRect(0, 0, s, s);
  g.fillStyle = ink;
  g.font = `700 ${Math.round(s * 0.46)}px "Barlow Condensed"`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, s / 2, s * 0.53);
  return texture(c);
}

interface Wipe {
  k: number;
  color: string;
  ink: string;
}

/**
 * Draws a floor marker: the board's disc, with a white edge and the label. With `wipe`, a second
 * colour fills the disc from the centre out (k from 0 to 1 of its radius), with its own label ink.
 */
function drawDisc(c: HTMLCanvasElement, label: string, color: string, ink: string, edge: string, wipe?: Wipe) {
  const s = c.width;
  const g = c.getContext("2d")!;
  const R = s / 2 - 2;
  const r = R * (8.5 / 9.5);
  g.clearRect(0, 0, s, s);
  g.beginPath();
  g.arc(s / 2, s / 2, R, 0, Math.PI * 2);
  g.fillStyle = edge;
  g.fill();
  const face = (fill: string, text: string) => {
    g.beginPath();
    g.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    if (!label) return;
    g.fillStyle = text;
    g.font = `700 ${Math.round(s * (label.length > 2 ? 0.3 : 0.37))}px "Barlow Condensed"`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, s / 2, s * 0.53);
  };
  const k = wipe?.k ?? 0;
  // A full wipe is drawn plainly, so no trace of the first colour stays at the clip's edge.
  if (wipe && k >= 1) face(wipe.color, wipe.ink);
  else face(color, ink);
  if (wipe && k > 0 && k < 1) {
    g.save();
    g.beginPath();
    g.arc(s / 2, s / 2, r * k, 0, Math.PI * 2);
    g.clip();
    face(wipe.color, wipe.ink);
    g.restore();
  }
}

export function createScene(canvas: HTMLCanvasElement, { labels, home, away }: SceneOptions): Scene {
  // ---------- renderer, scene, camera, light ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE.ground);
  const fog = new THREE.Fog(SCENE.ground, 26, 70);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  scene.add(new THREE.HemisphereLight(SCENE.sky, SCENE.floorLight, 1.5));
  const sun = new THREE.DirectionalLight(SCENE.sun, 2.4);
  sun.position.set(7, 16, 11);
  sun.target.position.set(0, 0, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  const flat = (color: number, opts: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, ...opts });
  const solid = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts });

  // ---------- the floor: ground, court, goal area, lines; flat, in the board's exact colours ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), flat(SCENE.ground));
  scene.add(ground);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2), flat(SCENE.court));
  court.position.set(0, 0.002, 10);
  scene.add(court);

  const arc = (cx: number, r: number, from: number, to: number, n = 48) => sample((u) => v2(cx + r * Math.cos(lerp(from, to, u)), r * Math.sin(lerp(from, to, u))), n);
  const areaPts = [...arc(-1.5, 6, Math.PI, Math.PI / 2), ...arc(1.5, 6, Math.PI / 2, 0)];
  const goalArea = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(areaPts)).rotateX(Math.PI / 2), flat(SCENE.goalArea));
  goalArea.position.y = 0.004;
  scene.add(goalArea);

  const lineMat = flat(SCENE.lines);
  const addLine = (pts: THREE.Vector2[], w: number) => {
    const m = new THREE.Mesh(ribbonGeometry(pts, w), lineMat);
    m.position.y = 0.005;
    scene.add(m);
  };
  addLine([v2(-10, 0), v2(10, 0)], 0.12);
  addLine([v2(-10, 20), v2(10, 20)], 0.12);
  addLine([v2(-10, 0), v2(-10, 20)], 0.12);
  addLine([v2(10, 0), v2(10, 20)], 0.12);
  addLine(areaPts, 0.1);
  addLine([v2(-0.5, 7), v2(0.5, 7)], 0.1);
  const nine = [...arc(-1.5, 9, Math.PI, Math.PI / 2, 80), ...arc(1.5, 9, Math.PI / 2, 0, 80)].filter((p) => Math.abs(p.x) <= 10);
  for (const d of dashes(nine, 0.4, 0.3)) addLine(d, 0.1);

  // ---------- the goal, as the IHF has it ----------
  // 3 × 2 m inside; posts and crossbar 8 cm square, their rear on the goal line, in bands of two
  // colours: 28 cm in each direction at the corners, 20 cm elsewhere. The net goes back 0.8 m at
  // the top and 1 m at the floor, held by a floor frame and two bows.
  const goal = new THREE.Group();
  const goalMats: THREE.Material[] = [];
  const goalMat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => {
    const m = solid(color, { roughness: 0.4, transparent: true, ...opts });
    goalMats.push(m);
    return m;
  };
  const bandA = goalMat(SCENE.posts);
  const bandB = goalMat(SCENE.band, { emissive: SCENE.bandGlow });
  const frameMat = goalMat(SCENE.frame, { roughness: 0.35, metalness: 0.3 });
  const block = (x0: number, x1: number, y0: number, y1: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -0.04);
    m.castShadow = true;
    goal.add(m);
  };
  for (const x0 of [-1.58, 1.5]) {
    for (let i = 0; i < 9; i++) block(x0, x0 + 0.08, i * 0.2, (i + 1) * 0.2, i % 2 ? bandA : bandB);
    block(x0, x0 + 0.08, 1.8, 2.0, bandA);
  }
  block(-1.58, -1.3, 2.0, 2.08, bandA);
  for (let i = 0; i < 13; i++) block(-1.3 + i * 0.2, -1.1 + i * 0.2, 2.0, 2.08, i % 2 ? bandA : bandB);
  block(1.3, 1.58, 2.0, 2.08, bandA);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const tube = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const d = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), frameMat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    m.castShadow = true;
    goal.add(m);
  };
  for (const x of [-1.54, 1.54]) {
    tube(V(x, 0.02, -0.08), V(x, 0.02, -1.0), 0.02);
    tube(V(x, 2.04, -0.08), V(x, 2.04, -0.8), 0.018);
    tube(V(x, 2.04, -0.8), V(x, 0.02, -1.0), 0.018);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), frameMat);
    knee.position.set(x, 2.04, -0.8);
    goal.add(knee);
  }
  tube(V(-1.54, 0.02, -1.0), V(1.54, 0.02, -1.0), 0.02);
  // The net: white cord in 10 cm meshes, a texture tile of 4 × 4 meshes.
  const net = canvas2d(256, 256);
  net.g.strokeStyle = css(SCENE.net);
  net.g.lineWidth = 7;
  for (let i = 0; i <= 4; i++) {
    const p = (i * 256) / 4;
    net.g.beginPath();
    net.g.moveTo(p, 0);
    net.g.lineTo(p, 256);
    net.g.moveTo(0, p);
    net.g.lineTo(256, p);
    net.g.stroke();
  }
  const netTex = texture(net.c);
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  const netMat = new THREE.MeshStandardMaterial({ map: netTex, roughness: 0.9, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const netPanel = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    const e1 = b.clone().sub(a).normalize();
    const n = e1.clone().cross(d.clone().sub(a)).normalize();
    const e2 = n.clone().cross(e1);
    const uv = (p: THREE.Vector3) => [p.clone().sub(a).dot(e1) / 0.4, p.clone().sub(a).dot(e2) / 0.4];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([a, b, c, d].flatMap(uv), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    goal.add(new THREE.Mesh(g, netMat));
  };
  netPanel(V(-1.55, 2.03, -0.08), V(1.55, 2.03, -0.08), V(1.55, 2.03, -0.8), V(-1.55, 2.03, -0.8));
  netPanel(V(-1.55, 2.03, -0.8), V(1.55, 2.03, -0.8), V(1.55, 0, -1.0), V(-1.55, 0, -1.0));
  for (const x of [-1.55, 1.55]) netPanel(V(x, 0, -0.08), V(x, 0, -1.0), V(x, 2.03, -0.8), V(x, 2.03, -0.08));
  scene.add(goal);

  // ---------- the hall: walls, wall bars, scoreboard; they fade as the camera rises ----------
  const hall = new THREE.Group();
  const fadeMats: THREE.Material[] = [];
  const fading = <M extends THREE.Material>(m: M) => {
    m.transparent = true;
    fadeMats.push(m);
    return m;
  };
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(70, 14), fading(flat(SCENE.wall)));
  backWall.position.set(0, 7, -5);
  backWall.receiveShadow = true;
  hall.add(backWall);
  for (const sx of [-14, 14]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), fading(flat(SCENE.wall)));
    w.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    w.position.set(sx, 7, 15);
    w.receiveShadow = true;
    hall.add(w);
  }
  const woodMat = fading(solid(SCENE.wood, { roughness: 0.7 }));
  const bars = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const x = -9 + i * 1.1;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.0, 0.08), woodMat);
    post.position.set(x, 1.5, -4.9);
    bars.add(post);
    if (i < 8) {
      for (let k = 0; k < 15; k++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.02, 8), woodMat);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(x + 0.55, 0.25 + k * 0.18, -4.86);
        bars.add(rung);
      }
    }
  }
  for (const m of bars.children) m.castShadow = true;
  hall.add(bars);
  const board = canvas2d(840, 360);
  const boardTex = texture(board.c);
  let score: number | null = null;
  const scoreboard = (goals: number) => {
    if (score === goals) return;
    score = goals;
    const g = board.g;
    g.fillStyle = css(SCENE.scoreboard);
    g.fillRect(0, 0, 840, 360);
    g.fillStyle = css(SCENE.scoreText);
    g.font = '700 54px "JetBrains Mono"';
    g.textAlign = "center";
    g.fillText(home.toUpperCase(), 210, 90);
    g.fillText(away.toUpperCase(), 630, 90);
    g.font = '800 200px "Barlow Condensed"';
    g.fillStyle = css(goals ? SCENE.scoreHome : SCENE.scoreText);
    g.fillText(String(goals), 210, 300);
    g.fillStyle = css(SCENE.scoreText);
    g.fillText("0", 630, 300);
    g.fillText(":", 420, 290);
    boardTex.needsUpdate = true;
  };
  scoreboard(0);
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.8), fading(new THREE.MeshBasicMaterial({ map: boardTex })));
  sb.position.set(3.6, 4.4, -4.95);
  hall.add(sb);
  scene.add(hall);

  // Shadows land on a catcher over the flat floor, so the floor keeps its exact colours.
  const shadowMat = new THREE.ShadowMaterial({ color: SCENE.shadow, opacity: 0.18 });
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), shadowMat);
  catcher.position.set(0, 0.006, 8);
  catcher.receiveShadow = true;
  scene.add(catcher);

  // ---------- the players ----------
  const G = {
    leg: new THREE.CapsuleGeometry(0.085, 0.48, 6, 12),
    torso: new THREE.CapsuleGeometry(0.23, 0.4, 8, 16),
    arm: new THREE.CapsuleGeometry(0.065, 0.4, 6, 12),
    hand: new THREE.SphereGeometry(0.075, 16, 12),
    head: new THREE.SphereGeometry(0.18, 24, 16),
    hair: new THREE.SphereGeometry(0.188, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    shoe: new THREE.BoxGeometry(0.13, 0.09, 0.24),
    disc: new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2),
  };
  const skinMat = solid(SCENE.skin, { roughness: 0.7 });
  const shoeMat = solid(SCENE.shoe, { roughness: 0.5 });

  interface Pose {
    pos: THREE.Vector2;
    heading: number;
    run?: number;
    phase?: number;
    lean?: number;
    roll?: number;
    jump?: number;
    throwArm?: number;
    sink?: number;
    disc?: number;
    discOpacity?: number;
    dive?: number;
    carry?: number;
    guard?: number;
    block?: number;
  }

  let count = 0;
  class Figure {
    label: string;
    attack: boolean;
    home: THREE.Vector2;
    heading: number;
    root = new THREE.Group();
    body = new THREE.Group();
    hips: THREE.Group[];
    shoulders: THREE.Group[];
    discMat: THREE.MeshBasicMaterial;
    disc: THREE.Mesh;
    wiped = 0;

    constructor(label: string, attack: boolean, keeper: boolean, at: THREE.Vector2) {
      this.label = label;
      this.attack = attack;
      this.home = at.clone();
      this.heading = attack ? 0 : Math.PI;
      const jm = solid(attack ? SCENE.attack : keeper ? SCENE.keeper : SCENE.defense, { roughness: 0.55 });
      const lm = solid(attack ? SCENE.attackLegs : SCENE.defenseLegs, { roughness: 0.6 });
      const sm = skinMat.clone();
      const hm = solid(SCENE.hair[count++ % SCENE.hair.length]!, { roughness: 0.8 });
      const shm = shoeMat.clone();
      this.root.add(this.body);
      const part = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        parent.add(m);
        return m;
      };
      this.hips = [-0.11, 0.11].map((x) => {
        const hip = new THREE.Group();
        hip.position.set(x, 0.8, 0);
        this.body.add(hip);
        part(G.leg, lm, hip, 0, -0.33, 0);
        part(G.shoe, shm, hip, 0, -0.74, -0.04);
        return hip;
      });
      part(G.torso, jm, this.body, 0, 1.2, 0);
      part(G.head, sm, this.body, 0, 1.86, 0);
      const hair = part(G.hair, hm, this.body, 0, 1.875, 0.015);
      hair.rotation.x = 0.18;
      this.shoulders = [-0.31, 0.31].map((x) => {
        const sh = new THREE.Group();
        sh.position.set(x, 1.46, 0);
        this.body.add(sh);
        part(G.arm, jm, sh, 0, -0.26, 0);
        part(G.hand, sm, sh, 0, -0.55, 0);
        return sh;
      });
      if (label && attack) {
        const back = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: labelTexture(label, css(SCENE.attack), css(SCENE.attackLabel)), transparent: true }));
        back.position.set(0, 1.27, 0.235);
        this.body.add(back);
      }
      scene.add(this.root);
      const { c } = canvas2d(512, 512);
      drawDisc(c, label, css(attack ? SCENE.attack : SCENE.defense), css(attack ? SCENE.attackLabel : SCENE.defenseLabel), css(SCENE.discEdge));
      this.discMat = new THREE.MeshBasicMaterial({ map: texture(c), transparent: true, depthWrite: false });
      this.disc = new THREE.Mesh(G.disc, this.discMat);
      this.disc.renderOrder = 2;
      scene.add(this.disc);
    }

    /** Fills an attacker's disc with Coachboard's colour, from the centre out (k from 0 to 1). */
    wipe(k: number) {
      if (!this.attack || k === this.wiped) return;
      this.wiped = k;
      drawDisc(this.discMat.map!.image as HTMLCanvasElement, this.label, css(SCENE.attack), css(SCENE.attackLabel), css(SCENE.discEdge), { k, color: css(END.attack), ink: css(END.attackLabel) });
      this.discMat.map!.needsUpdate = true;
    }

    /** Puts the figure in place and in its pose for this moment. */
    pose({ pos, heading, run = 0, phase = 0, lean = 0, roll = 0, jump = 0, throwArm = 0, sink = 0, disc = 0.55, discOpacity = 0.9, dive = 0, carry = 0, guard = 0, block = 0 }: Pose) {
      this.root.position.set(pos.x, 0, pos.y);
      this.root.rotation.y = heading;
      const swing = Math.sin(phase) * 0.7 * run;
      const [hipL, hipR] = this.hips as [THREE.Group, THREE.Group];
      const [shL, shR] = this.shoulders as [THREE.Group, THREE.Group];
      hipL.rotation.x = swing;
      hipR.rotation.x = -swing;
      const up = guard * 2.0 * (1 - block) + block * 2.9;
      shL.rotation.x = -swing * 0.8 * (1 - guard) + carry * 0.9 + up;
      shR.rotation.x = swing * 0.8 * (1 - guard) + throwArm * -2.9 + carry * 0.9 + up;
      shL.rotation.z = -guard * 0.5 * (1 - block) - block * 0.12;
      shR.rotation.z = throwArm * 0.25 + guard * 0.5 * (1 - block) + block * 0.12;
      hipL.rotation.z = -guard * 0.13;
      hipR.rotation.z = guard * 0.13;
      this.body.position.y = Math.abs(Math.sin(phase)) * 0.07 * run + jump + dive * 0.35 - guard * 0.06 + block * 0.18;
      this.body.rotation.x = -0.14 * run + lean;
      this.body.rotation.z = roll - dive * 1.25;
      this.body.position.x = dive * 0.9;
      this.root.scale.set(1, Math.max(0.001, 1 - sink), 1);
      // The figures stay solid as they sink, and go once they are a third of their height.
      this.root.visible = sink < 0.673;
      this.disc.position.set(pos.x, 0.009, pos.y);
      this.disc.scale.setScalar(disc);
      this.discMat.opacity = discOpacity;
    }
  }

  // The lineup: six attackers with their labels, the keeper, and six defenders without.
  const F = LINEUP.map(([x, y], i) => new Figure(labels[i] ?? "", i < 6, i === 6, dm(x, y)));
  const [LH, LO, MO, RO, RH, CL, K, D7, D8, D9, D10, D11, D12] = F as [Figure, Figure, Figure, Figure, Figure, Figure, Figure, Figure, Figure, Figure, Figure, Figure, Figure];

  const ballMat = solid(SCENE.ball, { roughness: 0.45, transparent: true });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 20), ballMat);
  ball.castShadow = true;
  scene.add(ball);

  // ---------- trails: the board's arrows, drawn on the floor as the players move ----------
  const trailMat = flat(SCENE.trail, { transparent: true });
  const innerMat = flat(SCENE.trailInner, { transparent: true });
  const trails = new THREE.Group();
  scene.add(trails);
  let headScale = 1;
  const head = (at: THREE.Vector2, dir: THREE.Vector2, mat: THREE.Material) => {
    const d = dir.clone().normalize();
    const n = v2(-d.y, d.x);
    const L = 0.56 * headScale;
    const tip = at.clone().add(d.clone().multiplyScalar(L * 0.3));
    const back = at.clone().sub(d.clone().multiplyScalar(L * 0.7));
    const a = back.clone().add(n.clone().multiplyScalar(L / 2));
    const b = back.clone().sub(n.clone().multiplyScalar(L / 2));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([tip.x, 0, tip.y, a.x, 0, a.y, b.x, 0, b.y], 3));
    return new THREE.Mesh(g, mat);
  };
  const drawTrail = (move: Move, p: number, w: number) => {
    if (p <= 0) return;
    const pts = sample(move.f, move.n ?? 12);
    const total = pts.reduce((s, q, i) => (i ? s + q.distanceTo(pts[i - 1]!) : 0), 0);
    const upto = total * p;
    const part: THREE.Vector2[] = [];
    let along = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) along += pts[i]!.distanceTo(pts[i - 1]!);
      if (along <= upto) part.push(pts[i]!);
      else {
        const prev = pts[i - 1]!;
        const segLen = pts[i]!.distanceTo(prev);
        part.push(prev.clone().lerp(pts[i]!, (upto - (along - segLen)) / segLen));
        break;
      }
    }
    if (part.length < 2) return;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      m.renderOrder = 1;
      trails.add(m);
    };
    if (move.kind === "pass") for (const d of dashes(part, 0.4, 0.3)) add(ribbonGeometry(d, w), trailMat, 0.007);
    else if (move.kind === "shot") {
      add(ribbonGeometry(part, w * 2.625), trailMat, 0.007);
      add(ribbonGeometry(part, w), innerMat, 0.0075);
    } else add(ribbonGeometry(part, w), trailMat, 0.007);
    if (p >= 1) {
      const end = part[part.length - 1]!;
      const h = head(end, end.clone().sub(part[part.length - 2]!), move.kind === "shot" ? innerMat : trailMat);
      h.position.y = 0.008;
      h.renderOrder = 1;
      trails.add(h);
    }
  };
  const clearTrails = () => {
    for (const m of trails.children as THREE.Mesh[]) m.geometry.dispose();
    trails.clear();
  };

  // ---------- where the camera ends: straight down on the board ----------
  let width = 1;
  let height = 1;
  /** The camera's target and height at the end, so the court lies exactly on the board over the canvas. */
  let end = { x: 0, z: 8.126, h: 46.74 / (2 * Math.tan(THREE.MathUtils.degToRad(10))) };

  function render(t: number) {
    const time = t * SECONDS;
    const at = (name: Phase) => seg(t, PH[name][0], PH[name][1]);
    const uMO = ease(at("mo"));
    const uCL = ease(at("cl"));
    const uRO = at("ro");
    const uLO1 = ease(at("lo1"));
    const uBack = at("back");
    const uLO2 = ease(at("lo2"));
    const sF = at("F");
    // After the play: into the floor, the discs grow to the board's, and everyone back to the start.
    const sink = seg(t, 0.74, 0.85);
    const grow = smooth(seg(t, 0.76, 0.88));
    const rewind = ease(seg(t, 0.79, 0.9));
    const disc = lerp(0.55, 0.95, grow);
    const discOpacity = lerp(0.85, 1, grow);
    // As the attackers sink in, their discs fill with Coachboard's colour from the centre out.
    const wipeK = ease(seg(t, 0.745, 0.845));
    for (const f of F) f.wipe(wipeK);
    const idle = (f: Figure, i: number): Pose => ({ pos: f.home, heading: f.heading, phase: 0, lean: Math.sin(time * 2 + i) * 0.02, sink, disc, discOpacity });
    const runPhase = (d: number, stride = 1.5) => (d / stride) * Math.PI * 2;

    // MO goes at the goal on a slant to the left and gets the ball from RO; he faces the goal,
    // so his defender has to step out; then he plays the ball back to LO.
    const moPos = rewind > 0 ? MOVES.mo.f(1 - rewind) : MOVES.mo.f(uMO);
    const moSlant = headingTo(P.MO0, P.MO1);
    let moHeading: number;
    if (t < PH.mo[1]) moHeading = angLerp(0, moSlant, smooth(seg(t, 0.06, 0.12)));
    else if (t < PH.back[0] - 0.03) moHeading = angLerp(moSlant, -0.25, smooth(seg(t, PH.mo[1], PH.mo[1] + 0.04)));
    else moHeading = angLerp(-0.25, headingTo(P.MO1, P.LO1), smooth(seg(t, PH.back[0] - 0.03, PH.back[0])));
    MO.pose({ pos: moPos, heading: rewind > 0 ? 0 : moHeading, run: uMO > 0 && uMO < 1 ? 1 : 0, phase: runPhase(P.MO0.distanceTo(moPos)), sink, disc, discOpacity, carry: t >= PH.ro[1] && t < PH.back[0] ? 1 : 0 });

    // LO starts only when MO has the ball, crosses behind him, asks for the ball with his hand,
    // runs on and shoots.
    let loPos: THREE.Vector2;
    let loHeading: number;
    let loRun = 0;
    let loPhase = 0;
    if (t < PH.lo1[1]) {
      loPos = MOVES.lo1.f(uLO1);
      const ahead = MOVES.lo1.f(Math.min(1, uLO1 + 0.03));
      loRun = uLO1 > 0 && uLO1 < 1 ? 1 : 0;
      loPhase = runPhase(uLO1 * 6.4, 1.6);
      loHeading = uLO1 <= 0 ? 0 : ahead.distanceTo(loPos) > 1e-4 ? headingTo(loPos, ahead) : headingTo(P.LO1, P.MO1);
    } else if (t < PH.lo2[0]) {
      loPos = P.LO1.clone();
      loHeading = headingTo(P.LO1, P.MO1);
    } else if (t < PH.F[0]) {
      loPos = MOVES.lo2.f(uLO2);
      loRun = uLO2 > 0 && uLO2 < 1 ? 1 : 0;
      loPhase = runPhase(P.LO1.distanceTo(loPos), 1.6);
      loHeading = angLerp(headingTo(P.LO1, P.MO1), 0, smooth(seg(t, PH.lo2[0], PH.lo2[0] + 0.03)));
    } else {
      loPos = P.LO2.clone();
      loHeading = headingTo(P.LO2, P.shotEnd);
    }
    if (rewind > 0) loPos = rewind < 0.35 ? MOVES.lo2.f(1 - rewind / 0.35) : MOVES.lo1.f(1 - (rewind - 0.35) / 0.65);
    const askHand = smooth(seg(t, 0.4, 0.44)) * (1 - smooth(seg(t, PH.back[1] - 0.012, PH.back[1] + 0.008)));
    const jump = sF > 0.2 && sF < 0.72 ? Math.sin(((sF - 0.2) / 0.52) * Math.PI) * 0.75 : 0;
    const throwArm = sF > 0 ? (sF < 0.42 ? smooth(seg(sF, 0.05, 0.42)) : lerp(1, 0.15, smooth(seg(sF, 0.42, 0.56)))) : 0;
    LO.pose({ pos: loPos, heading: rewind > 0 ? 0 : loHeading, run: loRun, phase: loPhase, jump, throwArm: Math.max(throwArm, askHand * 0.8), sink, disc, discOpacity, carry: t >= PH.back[1] && sF < 0.05 ? 1 : 0 });

    // RO has the ball and plays it to MO as MO arrives.
    const roToMO = headingTo(P.RO0, P.MO1);
    const roHeading = angLerp(angLerp(0, headingTo(P.RO0, P.MO0), 0.4), roToMO, smooth(seg(t, PH.ro[0] - 0.05, PH.ro[0])));
    const roWind = smooth(seg(t, PH.ro[0] - 0.035, PH.ro[0] - 0.005)) * (1 - smooth(seg(t, PH.ro[0] - 0.005, PH.ro[0] + 0.03)));
    RO.pose({ ...idle(RO, 3), heading: rewind > 0 ? 0 : roHeading, throwArm: roWind, carry: t > PH.ro[0] - 0.06 && t < PH.ro[0] - 0.03 ? 1 : 0 });

    // The ball.
    const fwd = (pos: THREE.Vector2, hd: number, d: number, side = 0) => v2(pos.x - Math.sin(hd) * d + Math.cos(hd) * side, pos.y - Math.cos(hd) * d - Math.sin(hd) * side);
    const bounce = (u: number) => 0.13 + Math.abs(Math.sin(u * Math.PI)) * 0.8;
    let bp: THREE.Vector2;
    let by: number;
    if (t < PH.ro[0] - 0.06) {
      bp = fwd(P.RO0, roHeading, 0.3, 0.34);
      by = bounce(time / 0.55);
    } else if (t < PH.ro[0] - 0.03) {
      bp = fwd(P.RO0, roHeading, 0.38, 0.05);
      by = 1.15;
    } else if (t < PH.ro[0]) {
      bp = fwd(P.RO0, roHeading, 0.05, 0.36);
      by = 1.3 + roWind * 0.9;
    } else if (t < PH.ro[1]) {
      const from = fwd(P.RO0, roToMO, 0.1, 0.36);
      const to = fwd(P.MO1, headingTo(P.MO1, P.RO0), 0.38, 0.05);
      bp = from.clone().lerp(to, uRO);
      by = lerp(2.0, 1.12, uRO) + Math.sin(uRO * Math.PI) * 0.6;
    } else if (t < PH.back[0]) {
      bp = fwd(moPos, moHeading, 0.38, 0.05);
      by = 1.12;
    } else if (t < PH.back[1]) {
      const from = fwd(P.MO1, headingTo(P.MO1, P.LO1), 0.38, 0.05);
      const to = fwd(P.LO1, headingTo(P.LO1, P.MO1), 0.38, -0.05);
      bp = from.clone().lerp(to, uBack);
      by = 1.12 + Math.sin(uBack * Math.PI) * 0.35;
    } else if (sF < 0.46) {
      const carry = sF < 0.05;
      bp = carry ? fwd(loPos, loHeading, 0.38, 0.1) : fwd(loPos, loHeading, -0.05 + 0.15 * throwArm, 0.36);
      by = carry ? 1.12 : 1.25 + jump + throwArm * 1.0;
    } else {
      const release = fwd(P.LO2, loHeading, 0.1, 0.36);
      const u = seg(sF, 0.46, 0.7);
      const corner = v2(1.1, -0.3);
      bp = release.clone().lerp(corner, u);
      by = lerp(2.85, 1.75, u);
      if (sF > 0.7) {
        const f = seg(sF, 0.7, 1);
        bp = corner.clone().lerp(v2(0.95, -0.8), f);
        by = lerp(1.75, 0.13, f * f);
      }
    }
    ball.position.set(bp.x, by, bp.y);
    ballMat.opacity = 1 - smooth(seg(t, 0.74, 0.82));
    ball.visible = ballMat.opacity > 0.01;
    const ballAt = v2(bp.x, bp.y);

    // CL runs to the right to the 6 metres, then turns to the ball.
    const clPos = rewind > 0 ? MOVES.cl.f(1 - rewind) : MOVES.cl.f(uCL);
    const clAhead = MOVES.cl.f(Math.min(1, uCL + 0.04));
    const clRunning = uCL > 0 && uCL < 1;
    const clHeading = rewind > 0 ? 0 : clRunning && clAhead.distanceTo(clPos) > 1e-4 ? headingTo(clPos, clAhead) : uCL >= 1 ? headingTo(clPos, ballAt) : 0;
    CL.pose({ pos: clPos, heading: clHeading, run: clRunning ? 1 : 0, phase: runPhase(uCL * 5.0, 1.3), sink, disc, discOpacity, guard: uCL >= 1 && rewind === 0 ? 0.25 : 0 });

    // The defence moves with the ball, guards it and shields CL; the wings watch the ball.
    const moving = (f: Figure, keys: readonly (readonly [number, number, number])[], i: number, opts: { block?: number; jump?: number } = {}) => {
      const now = track(keys, Math.min(t, 0.74));
      const last = track(keys, 0.74).pos;
      const pos = rewind > 0 ? last.clone().lerp(f.home, rewind) : now.pos;
      const near = Math.max(0, Math.min(1, 1.25 - pos.distanceTo(ballAt) / 7));
      f.pose({ pos, heading: rewind > 0 ? f.heading : headingTo(pos, ballAt), run: now.moving * 0.85, phase: (now.dist / 1.1) * Math.PI * 2, lean: Math.sin(time * 2 + i) * 0.02, sink, disc, discOpacity, guard: 0.35 + 0.65 * near, block: opts.block ?? 0, jump: opts.jump ?? 0 });
    };
    const blockUp = smooth(seg(sF, 0.25, 0.45)) * (1 - smooth(seg(sF, 0.75, 1)));
    moving(D7, DEF.D7, 7);
    moving(D8, DEF.D8, 8);
    moving(D9, DEF.D9, 9, { block: blockUp * 0.6 });
    moving(D10, DEF.D10, 10, { block: blockUp, jump: blockUp * 0.2 });
    moving(D11, DEF.D11, 11);
    moving(D12, DEF.D12, 12);
    for (const [f, i] of [[LH, 0], [RH, 4]] as const) f.pose({ ...idle(f, i), heading: rewind > 0 ? 0 : angLerp(0, headingTo(f.home, ballAt), 0.5) });

    // The keeper follows the ball, then dives the wrong way.
    const dive = smooth(seg(sF, 0.48, 0.75));
    K.pose({ ...idle(K, 6), pos: v2(K.home.x + Math.max(-0.6, Math.min(0.6, bp.x * 0.25)) * (1 - dive), K.home.y), heading: Math.PI, dive: rewind > 0 ? 0 : dive, lean: 0 });
    scoreboard(sF > 0.68 ? 1 : 0);

    // The trails: the tactic's arrows, drawn as the moves happen.
    clearTrails();
    const drawn = smooth(seg(t, 0.74, 0.88));
    const tw = lerp(0.1, 0.16, drawn);
    headScale = tw / 0.16;
    trailMat.opacity = lerp(0.55, 1, drawn);
    drawTrail(MOVES.cl, at("cl"), tw);
    drawTrail(MOVES.mo, at("mo"), tw);
    drawTrail(MOVES.ro, uRO, tw);
    drawTrail(MOVES.lo1, at("lo1"), tw);
    drawTrail(MOVES.back, uBack, tw);
    drawTrail(MOVES.lo2, at("lo2"), tw);
    drawTrail(MOVES.shot, seg(sF, 0.46, 0.7), tw);

    // The hall fades, the goal and the shadows go, the fog lifts.
    const hallFade = 1 - smooth(seg(t, 0.72, 0.82));
    for (const m of fadeMats) m.opacity = hallFade;
    hall.visible = hallFade > 0.01;
    netMat.opacity = hallFade;
    const goalO = lerp(1, 0, smooth(seg(t, 0.78, 0.88)));
    for (const m of goalMats) m.opacity = goalO;
    goal.visible = goalO > 0.001 || hallFade > 0.001;
    shadowMat.opacity = 0.18 * (1 - smooth(seg(t, 0.74, 0.84)));

    // The camera: behind MO in the hall, then up until it looks straight down at the board.
    const fo = focusAt(Math.min(t, 0.72));
    const camPlay = new THREE.Vector3(fo.x + 1.0, 3.1, fo.y + 7.6);
    const tgtPlay = new THREE.Vector3(fo.x - 0.35, 0.7, fo.y - 5.2);
    const rise = ease(seg(t, 0.72, 0.92));
    const target = tgtPlay.clone().lerp(new THREE.Vector3(end.x, 0, end.z), rise);
    const d0 = camPlay.clone().sub(tgtPlay);
    const dist = Math.exp(lerp(Math.log(d0.length()), Math.log(end.h), rise));
    const dir = d0.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(dir, new THREE.Vector3(0, 1, 0));
    const turned = dir.clone().applyQuaternion(new THREE.Quaternion().slerp(q, rise));
    camera.position.copy(target).add(turned.multiplyScalar(dist));
    camera.up.copy(new THREE.Vector3(0, 1, 0).lerp(new THREE.Vector3(0, 0, -1), smooth(rise)).normalize());
    camera.fov = lerp(50, 20, rise);
    camera.near = Math.max(0.05, dist * 0.08);
    camera.far = dist * 3 + 80;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    fog.near = lerp(26, 900, rise);
    fog.far = lerp(70, 1800, rise);

    renderer.render(scene, camera);
  }

  function resize(w: number, h: number, box: BoardBox) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setSize(width, height, false);
    // Looking straight down at 20°, the court's 21.6 m with its margins (the viewBox's 216 dm)
    // are as wide as the board, its centre under the board's centre, the viewBox's top (14 dm
    // behind the goal line) at the board's top.
    const s = box.width / 21.6;
    end = {
      x: -(box.left + box.width / 2 - width / 2) / s,
      z: -1.4 - (box.top - height / 2) / s,
      h: height / s / (2 * Math.tan(THREE.MathUtils.degToRad(10))),
    };
  }

  function dispose() {
    clearTrails();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const m of [o.material].flat() as THREE.Material[]) {
          for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
          m.dispose();
        }
      }
    });
    renderer.dispose();
  }

  return { render, resize, dispose };
}
