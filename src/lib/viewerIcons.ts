// From Coachboard, src/lib/viewerIcons.ts at commit 4ceafd4 (15 October 2026), unchanged.
// The icons the viewer (BoardViewer) draws. A module of their own: the viewer
// shares a chunk with the editor, and a module goes into one chunk whole, so
// the viewer doesn't carry the editor's icons. boardIcons in icons.ts spreads them.
export const viewerIcons = {
  // The kinds of arrow (the legend; the editor's kind bar)
  run: "M5 19 19 5m0 0h-8m8 0v8",
  pass: "M5 19 19 5m0 0h-8m8 0v8",
  dribble: "M4 18c2-1 1-4 3-5s3 1 5-1-0-4 2-5 3 0 5-3m0 0h-7m7 0v7",
  bounce: "M4 5l8 14 7-12m0 0h-5m5 0v5",
  shot: "M4 14 14 4M10 20 20 10M14 4h6v6",
  block: "M5 19 16 8m-5-5 10 10",
  // The title bar and the controls
  // The brand mark (Home); the pencil, as in the title (also on the home page, under How it works)
  court: "M5 3h14v18H5zM9 3v3h6V3",
  play: "M7 5v14l12-7z",
  stop: "M7 7h10v10H7z",
  draw: "M4 20h4L19 9l-4-4L4 16zm9-13 4 4",
  prev: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
} as const;
