import { text, type Locale } from "../i18n";
import { decode, type Board } from "../lib/board/format";
import { legendOf, type LegendItem } from "../lib/board/viewer";

// The board in the hero, as a Coachboard share link per language (brief, "Links").
// The link is the contract: the hero button opens it, and the board on the page
// is decoded from it at build time. One source for the board, its label (the
// board's title) and the button.
export const boards: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/board/#t=2.tZFBasMwEEWvMng9BEuJYmXdTaAKgm6FF2oiHBFVCbaz7x16w56kM7ITUuiyAdvzPR7_eXy5GqvX_hqHmDvY2e_PL2MrdI7aZlu1WISdxe4m3u7iNvNiWAgyK_XPmx50OadxpXFZoxAaRU2VdTO_byR_5fZ6XYpGKXmaukqjnvpyKkpyTzRsxysEmUjZFn6JjcKNoq3EDZ33I3yEEQ4B3n2CYX-8xgzZ-x5SzKdhwdy_0Mrv_wOmFepmwhLkRq51ATMWThz-CH5_HENPJwDJ5-6RZh5_Co6glB5waPtwCSHdUyrxGPtcGiHJq-CsOJ05FzqgSMd1vsDhHBIRtO0P",
  en: "https://handballcoachboard.com/en/board/#t=2.tZGxboMwEIZf5cR8ivA1Ds4KQ4YwRF06WAxOQwEJ4Sq2FGXrO_QN-yS9M6RKpY6NBNzPz_H7053NMavOPoRh6qAqvz4-6zJDa9muX7IGkygXUd3E84-49RykKsx2-yT-vPnBl7UG1wafclTKoMq5ii6W9y3JV7E3m1QMEkk3u9qgmX2aiybxVCFxcoTiEKIm8RMWGreaT2Vu6Hwb4DS4zk9uHK8wtm8RLkPsIfYtHNlbCfgvtvT__5AZjaaYuRSncWqeyOoSXmX6DHds-2E68Q7uQJbOh5AontAdCc_o3SWQ6KF-MIQizkoUa5nHMonQex8DuMjbcrKPpvkG",
};

/**
 * The board in a share link: what follows #t=, read by Coachboard's decode(),
 * as Coachboard's viewer reads its hash. A broken link throws, so it stops the
 * build: there is no fallback, and a broken board never reaches the site. So
 * does a link without a title: the title is the label above the court.
 */
export async function boardFrom(link: string): Promise<Board & { title: string }> {
  const at = link.indexOf("#t=");
  const board = at < 0 ? null : await decode(decodeURIComponent(link.slice(at + 3)));
  if (!board) throw new Error(`Not a board: ${link}`);
  if (!board.title) throw new Error(`No title: ${link}`);
  return { ...board, title: board.title };
}

/**
 * The legend of `board` in `locale`: each item of Coachboard's legendOf() with
 * its text. An item without a text throws, so it stops the build: a later board
 * with, say, a dribble needs its text agreed first.
 */
export function legendFor(board: Board, locale: Locale): { kind: LegendItem; text: string }[] {
  const kinds: Partial<Record<LegendItem, string>> = text(locale).board.kinds;
  return legendOf(board).map((kind) => {
    const label = kinds[kind];
    if (!label) throw new Error(`No text for the legend item ${kind} (${locale})`);
    return { kind, text: label };
  });
}
