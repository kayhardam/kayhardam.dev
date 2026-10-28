import type { Locale } from "../i18n";

// The addresses the page links to, from the brief ("Links").
export const coachboard: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/",
  en: "https://handballcoachboard.com/en/",
};

// The library in Coachboard, linked from the Coachboard section.
export const tactics: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/tactics/",
  en: "https://handballcoachboard.com/en/tactics/",
};

export const drills: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/drills/",
  en: "https://handballcoachboard.com/en/drills/",
};

export const github = "https://github.com/kayhardam";

// Coachboard itself, for sameAs in the JSON-LD: the root sends a visitor on to their language.
export const coachboardSite = "https://handballcoachboard.com/";

export const email = "hallo@kayhardam.dev";
export const mailto = `mailto:${email}`;
