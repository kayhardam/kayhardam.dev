<!--
  The hero (Hars, 15 November 2026): left the counter with the play button, the
  step's sentence, the four step lines and the link to Coachboard; right the
  court that plays the attack, with a label that follows the ball. On narrow
  screens the court is above the text (board.css). One island with
  client:visible (phase 5). On the server and in the first render in the
  browser it is the hero without JavaScript: step 1, with the buttons off; the
  link works. Once mounted the buttons work and the board plays by itself, in a
  loop, except with reduced motion. The playing is phase 5's, after Coachboard's
  BoardViewer.svelte (commit 4ceafd4): advance(), play(), stop() and sync() are
  unchanged; the step lines take the place of Previous and Next. The styles are
  global, in board.css.
-->
<script module lang="ts">
  /** After the shot: the ball in the goal this long (ms), then from the start (brief). */
  export const HOLD = 2600;
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { Board } from "../../lib/board/format";
  import { BALL_R } from "../../lib/board/geometry";
  import { moment } from "../../lib/board/play";
  import { moveFor, moves, stillFor } from "../../lib/board/viewer";
  import { point } from "../../lib/coords";
  import { viewerIcons as icons } from "../../lib/viewerIcons";
  import type { StepLine } from "../../data/boards";
  import type { Text } from "../../i18n/nl";
  import Court from "./Court.svelte";

  interface Props {
    board: Board;
    /** One line per step: stepsFor() in src/data/boards.ts. */
    steps: StepLine[];
    /** The share link, which opens the attack in Coachboard, and its text. */
    link: string;
    edit: string;
    locale: "nl" | "en";
    t: Text["board"];
  }

  let { board, steps, link, edit, locale, t }: Props = $props();

  /** The court up to 16 metres (brief): the attack stays inside it (boards.test.ts). */
  const CROP = "-8 -14 216 174";
  const [cropX, cropY, cropW, cropH] = CROP.split(" ").map(Number) as [number, number, number, number];
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
  /** Playing every step in a loop ("all"), or the move to the next step of a step line ("next"). */
  let playing = $state<"all" | "next" | null>(null);

  let card: HTMLElement;
  /** The clock runs only while something plays and the hero can be seen. */
  let inView = true;
  let hidden = false;
  let running = false;
  let frameRequest = 0;
  let last: number | null = null;
  /** Time played (ms) in the current part: a step still and its move, or the hold after the shot. */
  let elapsed = 0;
  let reduce = false;

  /** Where the balls are on the court now, for their rings in room. */
  const balls = $derived((shown ?? board).frames[step]!.balls);
  /** The label that follows the ball: where on the court box (%), and which way it sits from the ball. */
  const label = $derived.by(() => {
    const ball = balls[0];
    if (!ball) return null;
    const [x, y] = ball;
    return {
      text: `${t.ball} ${point(ball, locale)}`,
      left: ((x - cropX) / cropW) * 100,
      top: ((y - cropY) / cropH) * 100,
      // Left of the ball near the right side line, below it near the goal: always inside the court's box.
      flipX: x > 130,
      flipY: y < 40,
    };
  });
  const lastStep = $derived(board.frames.length - 1);
  const count = $derived(board.frames.length);
  const fill = (template: string) => template.replace("{n}", String(step + 1)).replace("{count}", String(count));
  /**
   * The sentence in two lines, as Kay wrote it (Hars): a sentence of two words,
   * "AI verkent.", gets a line per word. A board with a longer sentence (the
   * English one, until Kay makes the English link) is "long": smaller, wrapped.
   */
  const long = $derived(board.frames.some((f) => (f.text ?? "").split(" ").length !== 2));
  const words = $derived((board.frames[step]!.text ?? "").split(" "));
  /** Per step, whether anything moves from it: if not, nothing waits for it. */
  const moving = $derived(board.frames.map((_, i) => moves(board, i)));
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

  /** Runs the clock while something plays and the hero can be seen; pausing is not stopping. */
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
   * A step line: to step `i`. From standing still on the step before it, its
   * move plays, as Next did (phase 5), except with reduced motion. Anything
   * else goes there at once: while something plays, which stops it, from
   * further away, or back. Stopping first puts aria-live on polite; after
   * tick() the new sentence comes, and is read out.
   */
  async function goto(i: number) {
    const was = playing;
    const still = shown === null && !ended;
    halt();
    await tick();
    if (!was && still && !reduce && i === step + 1 && moving[step]) {
      playing = "next";
      sync();
      return;
    }
    show(i);
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

    // Astro's observer for client:visible disconnects after the first time, so the hero has its own.
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
  <div class="board-text">
    <div class="board-top">
      <!-- Off (disabled) without JavaScript. Before the counter, so the counter's width,
           which changes when the font comes, never moves it. -->
      <button type="button" class="play" aria-label={playing === "all" ? t.stop : t.play} title={playing === "all" ? t.stop : t.play} disabled={!ready} onclick={play}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={playing === "all" ? icons.stop : icons.play} /></svg>
      </button>
      <p class="board-count"><span aria-hidden="true">{fill(t.counter)}</span><span class="visually-hidden">{fill(t.step)}</span></p>
    </div>
    <!-- aria-atomic: a word per line, so a screen reader reads the whole sentence, not only the word that changed. -->
    <p class="board-step" class:long aria-live={live} aria-atomic="true">
      {#if long}{board.frames[step]!.text ?? ""}{:else}<span>{words[0]}</span> <span>{words[1]}</span>{/if}
    </p>
    <!-- Each line a button to its step; the one on the court is amber (aria-current). Off without JavaScript.
         Its name is the number and the kind; where the arrow goes is only to see. -->
    <ol class="board-steps" aria-label={t.steps}>
      {#each steps as line, i (i)}
        <li>
          <button type="button" aria-current={i === step ? "step" : undefined} disabled={!ready} onclick={() => goto(i)}>
            <span class="n">{String(i + 1).padStart(2, "0")}</span>
            <span class="data" aria-hidden="true">{line.from}<svg viewBox="0 0 16 8" aria-hidden="true"><path d="M1 4h13M10.5 1 14 4l-3.5 3" /></svg>{line.to}</span>
            <span class="kind">{line.kind}</span>
          </button>
        </li>
      {/each}
    </ol>
    <a class="board-edit" href={link}>{edit}</a>
  </div>
  <div class="board-court">
    <Court board={shown ?? board} frame={step} label={t.court} viewBox={CROP} />
    <!-- A ring in room around each ball, just outside its espresso edge: in the
         goal area gloed is 2.7:1, the ring 7.9:1 (Hars, step 2). On top of
         Court.svelte, which stays Coachboard's copy. -->
    <svg class="board-rings" viewBox={CROP} aria-hidden="true">
      {#each balls as [x, y], i (i)}
        <circle cx={x} cy={y} r={BALL_R + 0.8} stroke-width="0.8" />
      {/each}
    </svg>
    <!-- The ball keeps its label (Kay: colour is never the only sign). Only to see: it changes every frame.
         A layer without a viewBox, so the text is in real pixels while x and y follow the court in
         percent: SVG attributes, not a style attribute, which the CSP doesn't allow. -->
    {#if label}
      <svg class="board-ball" aria-hidden="true">
        <text x="{label.left}%" y="{label.top}%" dx={label.flipX ? -12 : 12} dy={label.flipY ? 24 : -16} text-anchor={label.flipX ? "end" : "start"}>{label.text}</text>
      </svg>
    {/if}
  </div>
</div>
