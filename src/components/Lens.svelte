<!--
  The lens over Coachboard's editor (Hars, 15 November 2026). A phone's frame
  with the screenshot of the editor (393 × 659), and over it a round lens that
  shows a second layer: the touch targets measured on that screen
  (src/data/tap-targets.json, by scripts/measure-coachboard.mjs). Beside the
  frame the target under the lens's centre, "Tikvlak <name>", with its size in
  px, and the hint. The lens follows the pointer or a finger, and the arrow
  keys once the frame has the focus (Shift: further).
  An island with client:visible. On the server and without JavaScript the lens
  stands on the smallest target. Everything that
  moves is an SVG attribute (the lens's clipPath circle), never a style
  attribute: the CSP doesn't allow one.
-->
<script lang="ts">
  import type { Text } from "../i18n/nl";

  type Target = {
    name: string;
    kind: string;
    shape: string;
    x: number;
    y: number;
    width: number;
    height: number;
    size?: number;
    /** A piece's area, as SVG's points: "x,y x,y …". */
    points?: string;
  };

  interface Props {
    targets: Target[];
    /** The screenshot from astro:assets: an AVIF and a WebP srcset, and the WebP as the img's src. */
    image: { avif: string; webp: string; src: string; sizes: string };
    locale: "nl" | "en";
    t: Text["lens"];
  }

  let { targets, image, locale, t }: Props = $props();

  /** The screenshot's window, in CSS pixels: the overlay's viewBox. */
  const W = 393;
  const H = 659;
  /** The lens's radius, in the screenshot's pixels. */
  const R = 64;
  /** How far an arrow key moves the lens, and with Shift. */
  const STEP = 8;
  const FAR = 40;

  const id = $props.id();
  const number = $derived(new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", { maximumFractionDigits: 1 }));

  /** Each area's points as numbers, for finding the target under the lens. */
  const polygons = $derived(targets.map((target) => target.points?.split(" ").map((p) => p.split(",").map(Number)) ?? null));

  /** Where the lens starts: the middle of the smallest piece's area, the one that shows most. */
  function start(): [number, number] {
    const areas = targets.filter((target) => target.points);
    const smallest = areas.reduce((a, b) => (b.size! < a.size! ? b : a));
    return [smallest.x + smallest.width / 2, smallest.y + smallest.height / 2];
  }

  let x = $state(start()[0]);
  let y = $state(start()[1]);
  let frame: HTMLElement;

  /** Whether (px, py) is inside `poly` (even–odd). */
  function inside(poly: number[][], px: number, py: number) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]!;
      const [xj, yj] = poly[j]!;
      if (yi! > py !== yj! > py && px < ((xj! - xi!) * (py - yi!)) / (yj! - yi!) + xi!) hit = !hit;
    }
    return hit;
  }

  /** The target under the lens's centre: a piece's area, or a button's or link's box. */
  const current = $derived(
    targets.find((target, i) =>
      polygons[i] ? inside(polygons[i], x, y) : x >= target.x && x <= target.x + target.width && y >= target.y && y <= target.y + target.height,
    ) ?? null,
  );
  /** Its size: a box's width × height, a piece's smallest width (Coachboard's measure). */
  const size = $derived(
    !current ? "" : current.points ? `${number.format(current.size!)} px` : `${number.format(current.width)} × ${number.format(current.height)} px`,
  );

  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));

  /** The pointer's place on the screenshot. */
  function follow(e: PointerEvent) {
    const r = frame.getBoundingClientRect();
    x = clamp(((e.clientX - r.left) / r.width) * W, W);
    y = clamp(((e.clientY - r.top) / r.height) * H, H);
  }

  function onkeydown(e: KeyboardEvent) {
    const d = e.shiftKey ? FAR : STEP;
    const move: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
    const m = move[e.key];
    if (!m) return;
    e.preventDefault();
    x = clamp(x + m[0], W);
    y = clamp(y + m[1], H);
  }

</script>

<div class="lens">
  <!-- Always in the tab order: the island hydrates when it comes into view, and the focus
       scrolls it into view, so a keyboard never skips it. An application: the arrow keys
       move the lens in two directions, so a screen reader passes them on; a slider moves in
       one. Svelte counts an application as not interactive, hence the two ignores. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    class="lens-frame"
    bind:this={frame}
    role="application"
    aria-label={t.label}
    aria-describedby="{id}-keys"
    tabindex="0"
    onpointerdown={follow}
    onpointermove={follow}
    {onkeydown}
  >
    <picture>
      <source type="image/avif" srcset={image.avif} sizes={image.sizes} />
      <source type="image/webp" srcset={image.webp} sizes={image.sizes} />
      <img src={image.src} srcset={image.webp} sizes={image.sizes} alt={t.image} width={W} height={H} loading="lazy" decoding="async" />
    </picture>
    <svg class="lens-layer" viewBox="0 0 {W} {H}" aria-hidden="true">
      <defs>
        <clipPath id="{id}-lens">
          <circle cx={x} cy={y} r={R} />
        </clipPath>
      </defs>
      <!-- The second layer: every measured target, seen only through the lens. -->
      <g clip-path="url(#{id}-lens)">
        <circle class="lens-glass" cx={x} cy={y} r={R} />
        {#each targets as target, i (i)}
          {#if target.points}
            <polygon class="target" class:on={target === current} points={target.points} />
          {:else}
            <rect class="target" class:on={target === current} x={target.x} y={target.y} width={target.width} height={target.height} rx="3" />
          {/if}
        {/each}
      </g>
      <circle class="lens-edge" cx={x} cy={y} r={R} />
      <circle class="lens-ring" cx={x} cy={y} r={R} />
    </svg>
  </div>
  <div class="lens-readout">
    <p class="lens-name" aria-live="polite">{current ? t.target.replace("{name}", current.name) : ""}</p>
    <p class="lens-size">{size}</p>
    <p class="lens-hint">{t.hint}</p>
    <p class="visually-hidden" id="{id}-keys">{t.keys}</p>
  </div>
</div>

<style>
  .lens {
    display: grid;
    gap: 32px;
    justify-items: start;
  }

  @media (min-width: 860px) {
    .lens {
      grid-template-columns: auto minmax(0, 1fr);
      gap: 64px;
      align-items: center;
    }
  }

  /* A phone: the screenshot in an edge of walnoot-donker, 10 px with its line, round.
     Its ratio is the screenshot's, so nothing moves while it loads. The line is a
     border, not a shadow: the focus ring's espresso edge is a shadow (base.css).
     touch-action: a finger moves the lens; swiping up or down still scrolls the page. */
  .lens-frame {
    position: relative;
    width: min(100%, 340px);
    padding: 9px;
    border: 1px solid color-mix(in srgb, var(--room) 18%, transparent);
    border-radius: 40px;
    background: var(--walnoot-donker);
    touch-action: pan-y pinch-zoom;
    cursor: crosshair;
  }

  picture,
  img {
    display: block;
  }

  img {
    width: 100%;
    height: auto;
    aspect-ratio: 393 / 659;
    border-radius: 30px;
    background: var(--room);
  }

  .lens-layer {
    position: absolute;
    inset: 9px;
    width: calc(100% - 20px);
    height: calc(100% - 20px);
    overflow: visible;
    pointer-events: none;
  }

  /* Under the lens the screenshot darkens a little, so the targets stand out. */
  .lens-glass {
    fill: color-mix(in srgb, var(--espresso) 20%, transparent);
  }

  .target {
    fill: color-mix(in srgb, var(--amber) 45%, transparent);
    stroke: var(--amber);
    stroke-width: 2;
  }

  /* The target under the lens's centre: stronger, with an espresso edge. */
  .target.on {
    fill: color-mix(in srgb, var(--amber) 75%, transparent);
    stroke: var(--espresso);
  }

  /* The lens's edge: room, in espresso, so it shows on the light screenshot (17.5:1). */
  .lens-edge {
    fill: none;
    stroke: var(--espresso);
    stroke-width: 7;
  }

  .lens-ring {
    fill: none;
    stroke: var(--room);
    stroke-width: 3;
  }

  .lens-readout {
    min-height: 9.5em;
  }

  /* "Tikvlak CL": Barlow Condensed 800 in capitals; the size in JetBrains Mono, amber. */
  .lens-name {
    min-height: 1.1em;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(32px, 4vw, 44px);
    line-height: 1.1;
    text-transform: uppercase;
    color: var(--room);
  }

  .lens-size {
    min-height: 1.3em;
    margin-top: 8px;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 22px;
    line-height: 1.3;
    color: var(--amber);
  }

  .lens-hint {
    margin-top: 16px;
    color: var(--zand);
  }
</style>
