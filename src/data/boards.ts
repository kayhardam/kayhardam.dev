import { text, type Locale } from "../i18n";
import { decode, type ArrowKind, type Board } from "../lib/board/format";
import { point } from "../lib/coords";

// The board in the hero, as a Coachboard share link per language. The link is
// the contract: the hero's link opens it, and the board on the page is decoded
// from it at build time, with the sentence per step.
// Dutch: Kay's attack "Kruising AI–IK" (Hars, 15 November 2026). English, until
// Kay makes the English link of that attack: the brief's "Crossing CB–LB", the
// same attack with other words (Kay, 15 November 2026).
export const boards: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/board/#t=2.tY9BasMwEEWvYrT-BM3UisdL002FA4VuhTYtohgXGxyn2eYOvWFPUkZWIIUum4WYr5nPvD_BwvTLaTgO03vV-e_Ll-8NQrAwhycTocL3RXS-iJfnq7h6Hg8qCCZ76c8XESJCCIJa8GBBJCBrQaqb8m9Zp9re73MRMKu7FjiBbH3eimPtUaPrFEEWxBxzfkbj0LoYNXf1mZYxTetO0_0KkE3_gxcHaTY4gciBbMb7sRqHdLxhl-Fd4AS-hXe-ep1P5_W-dGKHNuNrvb1c_TZP6zJ_pLTsTIzxBw",
  en: "https://handballcoachboard.com/en/board/#t=2.tZGxboMwEIZf5cR8ivA1Ds4KQ4YwRF06WAxOQwEJ4Sq2FGXrO_QN-yS9M6RKpY6NBNzPz_H7053NMavOPoRh6qAqvz4-6zJDa9muX7IGkygXUd3E84-49RykKsx2-yT-vPnBl7UG1wafclTKoMq5ii6W9y3JV7E3m1QMEkk3u9qgmX2aiybxVCFxcoTiEKIm8RMWGreaT2Vu6Hwb4DS4zk9uHK8wtm8RLkPsIfYtHNlbCfgvtvT__5AZjaaYuRSncWqeyOoSXmX6DHds-2E68Q7uQJbOh5AontAdCc_o3SWQ6KF-MIQizkoUa5nHMonQex8DuMjbcrKPpvkG",
};

/**
 * The board in a share link: what follows #t=, read by Coachboard's decode(),
 * as Coachboard's viewer reads its hash. A broken link throws, so it stops the
 * build: there is no fallback, and a broken board never reaches the site. So
 * does a link without a title: the title names the board when the hero's link
 * opens it in Coachboard.
 */
export async function boardFrom(link: string): Promise<Board & { title: string }> {
  const at = link.indexOf("#t=");
  const board = at < 0 ? null : await decode(decodeURIComponent(link.slice(at + 3)));
  if (!board) throw new Error(`Not a board: ${link}`);
  if (!board.title) throw new Error(`No title: ${link}`);
  return { ...board, title: board.title };
}

/** A step line in the hero: what the step's one arrow does, and from where to where (the hero draws the arrow between). */
export type StepLine = { kind: string; from: string; to: string };

/**
 * The step lines of `board` in `locale`, one per step: the kind of the step's
 * arrow, in its text from the board's `kinds`, and where it starts and ends,
 * in metres (src/lib/coords.ts). A step without exactly one arrow, or an arrow
 * without a text for its kind, throws, so it stops the build: a later board
 * with, say, a dribble needs its text agreed first.
 */
export function stepsFor(board: Board, locale: Locale): StepLine[] {
  const kinds: Partial<Record<ArrowKind, string>> = text(locale).board.kinds;
  return board.frames.map((frame, i) => {
    if (frame.arrows.length !== 1) throw new Error(`Step ${i + 1} has ${frame.arrows.length} arrows, not 1`);
    const arrow = frame.arrows[0]!;
    const kind = kinds[arrow.kind];
    if (!kind) throw new Error(`No text for the kind ${arrow.kind} (${locale})`);
    return { kind, from: point(arrow.pts[0]!, locale), to: point(arrow.pts.at(-1)!, locale) };
  });
}
