<!--
  The board card in the hero: the label and the counter, the step's sentence,
  the court, the legend and the buttons. Until phase 5 Astro renders it at build
  time only (no client: directive): step 1, with the buttons off. Phase 5 gives
  this component client:visible and the state to play. The styles are global, in
  board.css, as BoardViewer.css is in Coachboard.
-->
<script lang="ts">
  import type { Board } from "../../lib/board/format";
  import type { LegendItem } from "../../lib/board/viewer";
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

  const step = 0;
  const count = $derived(board.frames.length);
  const where = $derived(t.step.replace("{n}", String(step + 1)).replace("{count}", String(count)));
</script>

<div class="board">
  <div class="board-body">
    <div class="board-head">
      <p class="board-label">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons.court} /></svg>
        <span>{t.label}</span>
      </p>
      <p class="board-count"><span aria-hidden="true">{step + 1}/{count}</span><span class="visually-hidden">{where}</span></p>
    </div>
    <p class="board-step" aria-live="polite">{board.frames[step]!.text ?? ""}</p>
    <div class="board-court">
      <Court {board} frame={step} label={t.court} viewBox={CROP} />
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
      <!-- Off without JavaScript; phase 5 turns them on. -->
      <div class="board-controls">
        <button type="button" aria-label={t.prev} title={t.prev} disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons.prev} /></svg>
        </button>
        <button type="button" class="play" aria-label={t.play} title={t.play} disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons.play} /></svg>
        </button>
        <button type="button" aria-label={t.next} title={t.next} disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons.next} /></svg>
        </button>
      </div>
    </div>
  </div>
</div>
