<!--
  The board card in the hero: the label and the counter, the step's sentence,
  the court, the legend and the buttons. An island with client:visible (phase 5).
  On the server and in the first render in the browser it is the card without
  JavaScript: step 1, with the buttons off. Once mounted the buttons work and
  the board plays by itself, in a loop, except with reduced motion. The controls
  follow Coachboard's BoardViewer.svelte (commit 4ceafd4), with the choices of
  docs/plan-fase-5.md. The styles are global, in board.css, as BoardViewer.css
  is in Coachboard.
-->
<script module lang="ts">
  /** After the shot: the ball in the goal this long (ms), then from the start (brief). */
  export const HOLD = 2600;
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { Board } from "../../lib/board/format";
  import { moment } from "../../lib/board/play";
  import { moveFor, moves, stillFor, type LegendItem } from "../../lib/board/viewer";
  import { viewerIcons as icons } from "../../lib/viewerIcons";
  import type { Text } from "../../i18n/nl";
  import Court from "./Court.svelte";

  interface Props {
    board: Board;
    /** The legend, with its texts: legendFor() in src/data/boards.ts. */
    legend: { kind: LegendItem; text: string }[];
    t: Text["board"];
  }

  let { board, legend, t }: Props = $props();

  /** The court up to 16 metres (brief): the attack stays inside it (boards.test.ts). */
  const CROP = "-8 -14 216 174";
  /** A frame counts at most this long (ms): after a hang the board doesn't jump ahead. */
  const FRAME = 100;

  /** The buttons work: false on the server and until mounted, so hydrating sees the HTML without JavaScript. */
  let ready = $state(false);
  /** The step on the court. */
  let step = $state(0);
  /** Past the shot: everyone where the arrows of the last step take them. */
  let ended = $state(false);
  /** What the court shows while moving or after the shot; null: the step itself. */
  let shown = $state.raw<Board | null>(null);
  /** Playing every step in a loop ("all"), or the move of Next ("next"). */
  let playing = $state<"all" | "next" | null>(null);

  let card: HTMLElement;
  /** The clock runs only while something plays and the card can be seen. */
  let inView = true;
  let hidden = false;
  let running = false;
  let frameRequest = 0;
  let last: number | null = null;
  /** Time played (ms) in the current part: a step still and its move, or the hold after the shot. */
  let elapsed = 0;
  let reduce = false;

  const lastStep = $derived(board.frames.length - 1);
  const count = $derived(board.frames.length);
  const where = $derived(t.step.replace("{n}", String(step + 1)).replace("{count}", String(count)));
  /** Per step, whether anything moves from it: if not, nothing waits for it. */
  const moving = $derived(board.frames.map((_, i) => moves(board, i)));
  /** Next has nothing left to play: past the shot, or on a last step that doesn't move. */
  const done = $derived(ended || (step === lastStep && !moving[lastStep]));
  /** Previous has nothing to do: still on step 1. */
  const first = $derived(step === 0 && !ended && !playing);
  /** Read out only what the visitor asks for: off while the board plays by itself (Kay, 19 October 2026). */
  const live = $derived(playing === "all" ? "off" : "polite");

  /** Step `i` at `k` (0 to 1) of its move: the moment of play.ts in place of the step. */
  function at(i: number, k: number): Board {
    return { ...board, frames: board.frames.map((f, j) => (j === i ? moment(board, i, k) : f)) };
  }

  /** Puts step `i` on the court, still; with `end`, where its arrows take everyone. */
  function show(i: number, end = false) {
    step = i;
    ended = end;
    shown = end ? at(i, 1) : null;
    elapsed = 0;
  }

  function halt() {
    playing = null;
    sync();
  }

  /**
   * `dt` ms more of playing. With "all" a step first shows still long enough to
   * read (viewer.ts), then moves; after the shot the board holds, then starts
   * again. "next" only moves, and stops on the next step or after the shot.
   * What is left of a part goes on into the next, so a round takes exactly the
   * sum of its parts. With reduced motion nothing moves: the board waits the
   * move's time and jumps.
   */
  function advance(dt: number) {
    elapsed += dt;
    const all = playing === "all";
    for (;;) {
      if (ended) {
        if (!all || elapsed < HOLD) return;
        elapsed -= HOLD;
        step = 0;
        ended = false;
        shown = null;
        continue;
      }
      const f = board.frames[step]!;
      const still = all ? stillFor(f) : 0;
      const move = moving[step] ? moveFor(f) : 0;
      if (elapsed < still + move) {
        const k = (elapsed - still) / move;
        shown = k > 0 && !reduce ? at(step, k) : null;
        return;
      }
      elapsed -= still + move;
      if (step < lastStep) {
        step++;
        shown = null;
      } else if (moving[step]) {
        ended = true;
        shown = at(step, 1);
      } else if (all) {
        step = 0;
      }
      if (!all) return halt();
    }
  }

  function frame(now: number) {
    frameRequest = requestAnimationFrame(frame);
    const dt = last === null ? 0 : Math.min(FRAME, now - last);
    last = now;
    advance(dt);
  }

  /** Runs the clock while something plays and the card can be seen; pausing is not stopping. */
  function sync() {
    const go = !!playing && inView && !hidden;
    if (go === running) return;
    running = go;
    if (go) {
      last = null;
      frameRequest = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(frameRequest);
    }
  }

  /** Stop: the start of this step, or after the shot the end, where the board stays. */
  function stop() {
    show(step, ended);
    halt();
  }

  /**
   * Play: every step from the first, in a loop. aria-live goes off first; only
   * after Svelte's tick() does the sentence change, so the jump to step 1 isn't read out.
   */
  async function play() {
    if (playing === "all") return stop();
    halt();
    playing = "all";
    await tick();
    show(0);
    sync();
  }

  /**
   * Next: the move to the next step; on the last step the shot, after which the
   * board stays there. While something plays, with reduced motion, or on a step
   * where nothing moves, it goes there at once. Stopping first puts aria-live on
   * polite; after tick() the new sentence comes, and is read out.
   */
  async function next() {
    if (done) return;
    const was = playing;
    halt();
    await tick();
    if (was || reduce || !moving[step]) return step >= lastStep ? show(step, true) : show(step + 1);
    show(step);
    playing = "next";
    sync();
  }

  /** Previous: the step before; after the shot, or while something moves, the start of this step. */
  async function prev() {
    if (first) return;
    const moved = ended || shown !== null || playing === "next";
    halt();
    await tick();
    show(moved ? step : Math.max(0, step - 1));
  }

  onMount(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    reduce = motion.matches;
    // Turned on while playing: stop on the step's start. Turned off: nothing starts by itself.
    const onMotion = () => {
      reduce = motion.matches;
      if (reduce && playing) stop();
    };
    motion.addEventListener("change", onMotion);

    // Astro's observer for client:visible disconnects after the first time, so the card has its own.
    // Out of view and back quickly gives one callback two entries: the last is the one that holds.
    const observer = new IntersectionObserver((entries) => {
      inView = entries.at(-1)!.isIntersecting;
      sync();
    });
    observer.observe(card);
    const onVisibility = () => {
      hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    hidden = document.hidden;

    ready = true;
    if (!reduce) {
      playing = "all";
      sync();
    }
    return () => {
      motion.removeEventListener("change", onMotion);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(frameRequest);
    };
  });
</script>

<div class="board" bind:this={card}>
  <div class="board-body">
    <div class="board-head">
      <p class="board-label">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons.court} /></svg>
        <span>{t.label}</span>
      </p>
      <p class="board-count"><span aria-hidden="true">{step + 1}/{count}</span><span class="visually-hidden">{where}</span></p>
    </div>
    <p class="board-step" aria-live={live}>{board.frames[step]!.text ?? ""}</p>
    <div class="board-court">
      <Court board={shown ?? board} frame={step} label={t.court} viewBox={CROP} />
    </div>
    <div class="board-foot">
      <ul class="board-legend" aria-label={t.legend}>
        {#each legend as item (item.kind)}
          <li>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={icons[item.kind as keyof typeof icons]} stroke-dasharray={item.kind === "pass" || item.kind === "bounce" ? "3 3" : undefined} />
            </svg>{item.text}
          </li>
        {/each}
      </ul>
      <!-- Off (disabled) without JavaScript. Once mounted a button with nothing to do
           is aria-disabled, so the focus stays on it. -->
      <div class="board-controls">
        <button type="button" aria-label={t.prev} title={t.prev} disabled={!ready} aria-disabled={ready && first ? "true" : undefined} onclick={prev}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons.prev} /></svg>
        </button>
        <button type="button" class="play" aria-label={playing === "all" ? t.stop : t.play} title={playing === "all" ? t.stop : t.play} disabled={!ready} onclick={play}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={playing === "all" ? icons.stop : icons.play} /></svg>
        </button>
        <button type="button" aria-label={t.next} title={t.next} disabled={!ready} aria-disabled={ready && done ? "true" : undefined} onclick={next}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons.next} /></svg>
        </button>
      </div>
    </div>
  </div>
</div>
