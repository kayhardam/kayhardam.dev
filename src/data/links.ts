import type { Locale } from "../i18n";

// The addresses the page links to, from the brief ("Links").
export const coachboard: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/",
  en: "https://handballcoachboard.com/en/",
};

export const github = "https://github.com/kayhardam";

// Coachboard itself, for sameAs in the JSON-LD: the root sends a visitor on to their language.
export const coachboardSite = "https://handballcoachboard.com/";

/**
 * The evidence for the three figures under the hero (Hars, 15 November 2026): Coachboard
 * at 03be23b, with the lines that hold each measurement. A Markdown file shows its lines
 * only as plain text (?plain=1), so the anchor finds them.
 */
const coachboardAt = "https://github.com/kayhardam/coachboard/blob/03be23bea71d6bffa37d5af567b88376d3d592cc";
export const evidence = [
  // 12/12 screens with every button in view, was 3: the table "Knoppen bereikbaar".
  `${coachboardAt}/docs/metingen.md?plain=1#L352-L373`,
  // 4 actions to draw and share an attack, was 6: the row of T1 (~~6~~ 4), as agreed with Kay
  // in place of e2e/tasks.spec.ts lines 29–55, which have the 4 but not the 6.
  `${coachboardAt}/docs/metingen.md?plain=1#L1246-L1250`,
  // At most 1 px of shift while the court loads, was 52 px: finding 14.
  `${coachboardAt}/docs/metingen.md?plain=1#L495-L555`,
] as const;

export const email = "hallo@kayhardam.dev";
export const mailto = `mailto:${email}`;
