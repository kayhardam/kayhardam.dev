import { text, type Locale } from "../i18n";
import { decode, type Board } from "../lib/board/format";
import { legendOf, type LegendItem } from "../lib/board/viewer";

// The board in the hero, as a Coachboard share link per language (brief, "Links").
// The link is the contract: the hero button opens it, and the board on the page
// is decoded from it at build time. One source for the board and the button.
// The share images show step 1 too: after a change, run scripts/og-image.mjs again.
export const boards: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/board/#t=2.tZBBi8MgFIT_ysPzUHxubMx5L4VNCOxVPLipNKFuWpL0_y-atHRhj9uDzDg-9WOshBCwVkLUB-GQTbuZ5m4-H-Y-814nwxAfWf9cDtbBWmtQGLxJMBuwlODky21fqXSa4v0-i4FSabow0AZmzdUqWqWMy_Rc-oIlWCmX-RVKjUo7l7jp5P1C32GhY6AvH2nu-tsw0uj9RHEYz_Mucf9Cy9f_B8xomHLFYjBrsMxgdUvn6TbMC_muX8JETUvRj6dnmm38JTgM9YzTtDRfQ4iPlnI9dftaGlYaVcYpUjtbL3PXD2Ghy5WOlxB3wjn3Aw",
  en: "https://handballcoachboard.com/en/board/#t=2.tZFBS8QwEIX_ytDzQzKx2abX9uDBHsSLh5BD1q1toWzEBMR_L5N2ZQWP7iG8l5eZ5GPiFKoKzilUw0vlUUy3m_5inn_MpeZJlFE9PBbz5_JwHs45i9riXoHZgpUCi2_2favlVOLDoYiF1lJdWxgLu-V6E6Ml40aukydYgbX2hV-jMWiN98JNUxwTnZYwxXNY1y9ax7dMn0ueKc8jHcO63gn4L7bS_z9k1sA2GxeD2YBVIRs6ev2IKY2JjuO8nE_Ud1cge-VNSBj6mqTv6D0UkBxpuDEEa4O2UNQyj30SaY4xJwqZphjkP7z_Bg",
};

/**
 * The board in a share link: what follows #t=, read by Coachboard's decode(),
 * as Coachboard's viewer reads its hash. A broken link throws, so it stops the
 * build: there is no fallback, and a broken board never reaches the site.
 */
export async function boardFrom(link: string): Promise<Board> {
  const at = link.indexOf("#t=");
  const board = at < 0 ? null : await decode(decodeURIComponent(link.slice(at + 3)));
  if (!board) throw new Error(`Not a board: ${link}`);
  return board;
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
