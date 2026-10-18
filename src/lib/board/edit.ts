// From Coachboard, src/lib/board/edit.ts at commit 4ceafd4 (15 October 2026): only the
// type Selection, which Court.svelte imports. The editing operations stay in Coachboard.

/** A piece in the current frame, or a cone (cones belong to the board). */
export interface Selection {
  kind: "player" | "ball" | "arrow" | "cone";
  index: number;
}
