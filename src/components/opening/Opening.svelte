<!--
  The opening's 3D scene (Kay, 25 November 2026): an island with client:visible that draws the
  hall in a canvas, one moment per scroll position (src/lib/opening/scene.ts). Landing.astro has
  everything else, without JavaScript: the statement, the steps, the board at the end and the
  links; the page's CSS shows them along the scroll by itself (scroll-driven animations).
  The scene starts only where that CSS runs (the browser has animation-timeline) and the reader
  hasn't asked for less motion; then the page has the tall section to scroll through. It waits
  for the fonts its labels are drawn in, and draws only when the scroll moves and the section
  is in view. Until it has drawn, and if WebGL fails, the canvas stays transparent: the page
  shows the stage's ground, then the board. No style attribute (the CSP): the canvas's size is
  CSS, its state a data attribute on the section.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { createScene, type Labels, type Scene } from "../../lib/opening/scene";

  interface Props {
    /** The lineup's labels, from the attack's share link: LH, LO, MO, RO, RH, CL and K in Dutch. */
    labels: Labels;
    /** The scoreboard's teams. */
    home: string;
    away: string;
  }

  let { labels, home, away }: Props = $props();
  let canvas: HTMLCanvasElement;

  /** The fonts the scene draws its labels and scoreboard in (BaseLayout.astro loads them). */
  const FONTS = ['700 100px "Barlow Condensed"', '800 100px "Barlow Condensed"', '700 50px "JetBrains Mono"'];

  onMount(() => {
    const section = canvas.closest<HTMLElement>("[data-opening]");
    const board = section?.querySelector<HTMLElement>("[data-opening-board]");
    const runs = matchMedia("(prefers-reduced-motion: no-preference)").matches && CSS.supports("animation-timeline", "view()");
    if (!section || !board || !runs) return;

    let scene: Scene | null = null;
    let stopped = false;
    let shown = -1;
    let queued = false;
    let inView = true;

    /** Where the scroll is in the section, 0 to 1: as the CSS's view timeline, inset by the sticky header. */
    const progress = () => {
      const box = section.getBoundingClientRect();
      const header = parseFloat(getComputedStyle(section).getPropertyValue("--header")) || 0;
      const range = box.height - (window.innerHeight - header);
      return range > 0 ? Math.min(1, Math.max(0, (header - box.top) / range)) : 0;
    };
    const draw = () => {
      queued = false;
      const p = progress();
      if (!scene || p === shown) return;
      shown = p;
      scene.render(p);
    };
    const queue = () => {
      if (queued || !inView) return;
      queued = true;
      requestAnimationFrame(draw);
    };
    /** The canvas's size, and where the board lies over it: the camera ends on it. */
    const fit = () => {
      if (!scene) return;
      const c = canvas.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      scene.resize(c.width, c.height, { left: b.left - c.left, top: b.top - c.top, width: b.width });
      shown = -1;
      queue();
    };
    const seen = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true;
      queue();
    });
    const sized = new ResizeObserver(fit);

    Promise.all(FONTS.map((font) => document.fonts.load(font))).then(() => {
      if (stopped) return;
      try {
        scene = createScene(canvas, { labels, home, away });
      } catch {
        return; // No WebGL: the page goes on without the hall.
      }
      fit();
      draw();
      section.dataset.opening = "3d";
      seen.observe(section);
      sized.observe(canvas);
      sized.observe(board);
      addEventListener("scroll", queue, { passive: true });
    });

    return () => {
      stopped = true;
      seen.disconnect();
      sized.disconnect();
      removeEventListener("scroll", queue);
      scene?.dispose();
    };
  });
</script>

<canvas bind:this={canvas} class="scene" aria-hidden="true"></canvas>
