import type { Locale } from "../i18n";
import { settle, type Arrow, type Board, type Player, type Pt } from "../lib/board/format";

// The landing page's attack (Kay, 25 November 2026): "Kruising MO–LO" from Coachboard's library
// (src/content/library/nl/crossing-cb-lb.md in Coachboard), as a share link per language. The
// link is the contract, as in boards.ts: the opening's captions are its step sentences, its
// title names the attack, the players' labels are the scene's, and "Bewerk deze aanval in
// Coachboard" opens it. A broken link stops the build (boardFrom() in boards.ts).
// Dutch: the library's four steps, word for word. English: the same board with Coachboard's
// English labels (LW, LB, CB, RB, RW, P, GK); its title is the brief's "Crossing CB–LB", and the
// four sentences are a proposal (25 November 2026), not yet agreed with Kay: the second and
// third are the brief's, the first and the fourth follow the Dutch.
export const tactics: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/board/#t=2.tVKxbsMgEP2Vk-dTZIiDydylUhwhZUUMro1sNy6OMOncf-gf9kuqAztK1S4dMqB7HHfw3jt0jtnBX4d5cB0c1dfHZ6Uy1DrHrHrODEagFnBcwekG1pqnigDD7BDjn8ugNqi1llhI3ObImESW58gIl8t-z-mU0kLEIJFzqi4k7iTKlOcp7DjlWEnX0ROSLiGkc9wh4wVKiWwrsRSRJqeufRGZbhdsSBeM03QJMDf9dXDg6trDOLjzDNbB2Q-vXYDWwks9wnvt4KQ28FQtPbHY26YPc8KtBQFvNli_IS9-yI1P_hIbCf5XbClQiiSVoeDIuIhqGSdJlYIzjTVA3fTBeiCNtevmO06p-iGcGPI7MkcF88Xa8WZisP7aJbcq9VBGe_pLxWqTlGn6BTJcbUpTbKfJ07Dnph9sgOkC7WTHTWaM-QY",
  en: "https://handballcoachboard.com/en/board/#t=2.tVKxbsMgEP2Vk-drZIiDyYqHDPUQZemAGJyG2JYIVIYO3foP_cN-SXU4rlK1S4cM6B7Hcbx3D11i0UwhxtH30KjP949WFah1iUX7VBjMQF1Bs4DDN1hq9hQZFrvHDP5cBrVBrbXESuK6RMYksrJERri-7recTiktRA4SOafqSuJGopzzfA4bTjlWUzt6QlITQrrEDTJeoZTI1hJrkWlyurWtMtX1FRvSBX2wEU5j1wffOfcGzp4TdP4EvU0R0mDh2DkH5ylc4KBWsIfp1UeYxn5IkEKuEA8XmyYLbvR2RWP4oTS_9ktn5vZfnbVAKWaVDAVHxkUWyjipaRU8k6M2wtEOoz9Bo27ozIV3ocOQ3_BoFLx0mUYK0N6Xwpa-TLWMRMrZ5AoZLiPJdgWfPY1DCClCl6APnVsVxpgv",
};

/** The attack's page in Coachboard's library: in Dutch only, as the library has it. */
export const tacticPages: Partial<Record<Locale, string>> = {
  nl: "https://handballcoachboard.com/nl/tactics/crossing-cb-lb/",
};

/**
 * The end of the opening: the attack's first step with the arrows of all its steps, in the
 * order they happen, as one drawing. Each arrow starts where its player is by then (settle()):
 * LO's run, his run on and his shot follow each other.
 */
export function drawing(board: Board): Board {
  const [first] = board.frames;
  if (!first) throw new Error("A board without a step");
  const copy = ([x, y]: Pt): Pt => [x, y];
  return settle({
    v: 2,
    court: board.court,
    title: board.title,
    cones: [],
    frames: [
      {
        players: first.players.map((p): Player => ({ ...p, at: copy(p.at) })),
        balls: first.balls.map(copy),
        arrows: board.frames.flatMap((f) => f.arrows).map((a): Arrow => ({ ...a, pts: a.pts.map(copy) })),
      },
    ],
  });
}
