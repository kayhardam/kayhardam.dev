<!-- From Coachboard, src/components/board/Court.svelte at commit 4ceafd4 (15 October 2026), with one change: the optional prop viewBox. -->
<!--
  Draws a board as SVG. Pure: no browser APIs, so Astro can render it
  statically (tactic pages, the board's no-JS fallback) and BoardEditor can
  wrap it. Pieces carry data-kind / data-index for the editor's pointer
  handling.
-->
<script lang="ts">
  import type { Selection } from "../../lib/board/edit";
  import { COURT_WIDTH, type Board } from "../../lib/board/format";
  import {
    arrowMid,
    arrowPath,
    areaPath,
    BALL_R,
    blockBar,
    bouncePoint,
    HIT_R,
    PLAYER_R,
    POST_LEFT,
    POST_RIGHT,
  } from "../../lib/board/geometry";

  interface Props {
    board: Board;
    frame?: number;
    selected?: Selection | null;
    label?: string;
    viewBox?: string;
  }

  let { board, frame = 0, selected = null, label = "Handball court", viewBox: crop }: Props = $props();

  const uid = $props.id();
  const current = $derived(board.frames[frame] ?? board.frames[0]!);
  const length = $derived(board.court === "full" ? 400 : 200);
  const goals = $derived(board.court === "full" ? [0, 400] : [0]);
  const viewBox = $derived(crop ?? `-8 -14 ${COURT_WIDTH + 16} ${length + 14 + (length === 400 ? 14 : 8)}`);

  const colors = {
    court: "#f1f5f9",
    area: "#dbe4ee",
    line: "#64748b",
    ink: "#0f172a",
    attack: "#15803d",
    defence: "#0f172a",
    passer: "#2563eb",
    ball: "#f59e0b",
    cone: "#dc2626",
    coneEdge: "#7f1d1d",
    ballEdge: "#78350f",
    select: "#16a34a",
    trail: "#94a3b8",
  };

  /** Stop an arrow short when it ends on a player, so its head stays visible. */
  function trimFor(end: [number, number]): number {
    const onPlayer = current.players.some(
      (p) => Math.hypot(p.at[0] - end[0], p.at[1] - end[1]) <= PLAYER_R + 2,
    );
    return onPlayer ? PLAYER_R + 1.5 : 0;
  }

  const arrows = $derived(
    current.arrows.map((a) => {
      // A shot ends in the goal, never on a player.
      const trim = a.kind === "shot" ? 0 : trimFor(a.pts[a.pts.length - 1]!);
      return {
        kind: a.kind,
        d: arrowPath(a, trim),
        bar: a.kind === "block" ? blockBar(a, trim) : null,
        bounce: a.kind === "bounce" ? bouncePoint(a) : null,
        hit: arrowPath({ ...a, kind: "run" }),
      };
    }),
  );

  const teamColor = { a: colors.attack, d: colors.defence, p: colors.passer };

  /**
   * Where players stood in the step before, for each who moved: [then, now].
   * Drawn grey, thin and dotted, without a head, so they don't look like a
   * pass or a bounce (dashed, in the arrows' ink).
   */
  const trails = $derived.by((): [number[], number[]][] => {
    const before = board.frames[frame - 1];
    if (!before) return [];
    return current.players.flatMap((p, i) => {
      const was = before.players[i]?.at;
      return was && (was[0] !== p.at[0] || was[1] !== p.at[1]) ? [[was, p.at]] : [];
    });
  });

  /**
   * Handles of the selected arrow as [x, y, handle]: start, bend, end. An
   * arrow of a player has no start handle (it starts at the player, so a drag
   * there moves the player); a shot moves only its end.
   */
  const handles = $derived.by((): [number, number, number][] => {
    if (selected?.kind !== "arrow") return [];
    const a = current.arrows[selected.index];
    if (!a) return [];
    const end: [number, number, number] = [...a.pts[a.pts.length - 1]!, 2];
    if (a.kind === "shot") return [end];
    const rest: [number, number, number][] = [[...arrowMid(a), 1], end];
    return a.from === undefined ? [[...a.pts[0]!, 0], ...rest] : rest;
  });
</script>

<svg {viewBox} role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="{uid}-court">
      <rect x="0" y="0" width={COURT_WIDTH} height={length} />
    </clipPath>
    <marker
      id="{uid}-head"
      viewBox="0 0 10 10"
      refX="7"
      refY="5"
      markerWidth="3.5"
      markerHeight="3.5"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" fill={colors.ink} />
    </marker>
  </defs>

  <!-- Court -->
  <rect x="0" y="0" width={COURT_WIDTH} height={length} fill={colors.court} />
  <g clip-path="url(#{uid}-court)" fill="none" stroke={colors.line} stroke-width="1">
    {#each goals as goalY (goalY)}
      <path d={areaPath(60, goalY)} fill={colors.area} />
      <path d={areaPath(90, goalY)} stroke-dasharray="4 3" />
      <line
        x1="95"
        x2="105"
        y1={goalY === 0 ? 70 : 330}
        y2={goalY === 0 ? 70 : 330}
      />
    {/each}
    {#if length === 400}
      <line x1="0" x2={COURT_WIDTH} y1="200" y2="200" />
    {/if}
  </g>
  <rect
    x="0"
    y="0"
    width={COURT_WIDTH}
    height={length}
    fill="none"
    stroke={colors.line}
    stroke-width="1.2"
  />
  {#each goals as goalY (goalY)}
    <rect
      x={POST_LEFT}
      y={goalY === 0 ? -10 : 400}
      width={POST_RIGHT - POST_LEFT}
      height="10"
      fill="#ffffff"
      stroke={colors.ink}
      stroke-width="1.2"
    />
  {/each}

  <!-- Cones: on the floor, under everything else -->
  {#each board.cones as cone, i (i)}
    <g data-kind="cone" data-index={i} transform="translate({cone[0]} {cone[1]})">
      {#if selected?.kind === "cone" && selected.index === i}
        <circle r="7" fill="none" stroke={colors.select} stroke-width="1.5" />
      {/if}
      <path
        d="M 0 -4.5 L 4 3 L -4 3 Z"
        fill={colors.cone}
        stroke={colors.coneEdge}
        stroke-width="0.8"
        stroke-linejoin="round"
      />
    </g>
  {/each}

  <!-- Where players stood in the step before: under the arrows and players, and not to be tapped. -->
  {#if trails.length}
    <g class="trails" fill="none" stroke={colors.trail} stroke-width="0.8" stroke-dasharray="1 2" stroke-linecap="round" pointer-events="none">
      {#each trails as [then, now], i (i)}
        <line x1={then[0]} y1={then[1]} x2={now[0]} y2={now[1]} />
        <circle cx={then[0]} cy={then[1]} r={PLAYER_R - 0.5} />
      {/each}
    </g>
  {/if}

  <!-- Arrows. A shot is a double line: a white line on a wide one. A block ends in a bar. -->
  {#each arrows as arrow, i (i)}
    <g data-kind="arrow" data-index={i}>
      <path d={arrow.hit} fill="none" stroke="transparent" stroke-width={HIT_R} />
      {#if arrow.kind === "shot"}
        <path d={arrow.d} fill="none" stroke={colors.ink} stroke-width="4.2" />
      {/if}
      <path
        d={arrow.d}
        fill="none"
        stroke={arrow.kind === "shot" ? "#ffffff" : colors.ink}
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray={arrow.kind === "pass" || arrow.kind === "bounce" ? "4 3" : undefined}
        marker-end={arrow.kind === "block" ? undefined : `url(#${uid}-head)`}
      />
      {#if arrow.bar}
        <path d={arrow.bar} fill="none" stroke={colors.ink} stroke-width="1.6" stroke-linecap="round" />
      {/if}
      {#if arrow.bounce}
        <circle
          cx={arrow.bounce[0]}
          cy={arrow.bounce[1]}
          r="1.8"
          fill="#ffffff"
          stroke={colors.ink}
          stroke-width="1"
        />
      {/if}
    </g>
  {/each}

  <!-- Players -->
  {#each current.players as player, i (i)}
    <g data-kind="player" data-index={i} transform="translate({player.at[0]} {player.at[1]})">
      <circle r={HIT_R} fill="transparent" />
      {#if selected?.kind === "player" && selected.index === i}
        <circle r={PLAYER_R + 3} fill="none" stroke={colors.select} stroke-width="1.5" />
      {/if}
      <circle r={PLAYER_R} fill={teamColor[player.team]} stroke="#ffffff" stroke-width="1" />
      {#if player.label}
        <text
          y="0.5"
          fill="#ffffff"
          font-family="system-ui, sans-serif"
          font-size={player.label.length > 2 ? 6 : 7.5}
          font-weight="700"
          text-anchor="middle"
          dominant-baseline="central">{player.label}</text
        >
      {/if}
    </g>
  {/each}

  <!-- Balls -->
  {#each current.balls as ball, i (i)}
    <g data-kind="ball" data-index={i} transform="translate({ball[0]} {ball[1]})">
      <circle r={HIT_R} fill="transparent" />
      {#if selected?.kind === "ball" && selected.index === i}
        <circle r={BALL_R + 3} fill="none" stroke={colors.select} stroke-width="1.5" />
      {/if}
      <circle r={BALL_R} fill={colors.ball} stroke={colors.ballEdge} stroke-width="0.8" />
    </g>
  {/each}

  <!-- Handles of the selected arrow -->
  {#each handles as [x, y, h] (h)}
    <g data-kind="handle" data-index={h} transform="translate({x} {y})">
      <circle r={HIT_R} fill="transparent" />
      <circle
        r="3.5"
        fill="#ffffff"
        stroke={colors.select}
        stroke-width="1.5"
        stroke-dasharray={h === 1 ? "2 1.5" : undefined}
      />
    </g>
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    user-select: none;
    -webkit-user-select: none;
  }

  text {
    pointer-events: none;
  }
</style>
