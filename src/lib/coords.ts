// Where something is on the court, in metres, as the hero writes it: in the
// step lines (built at build time) and in the label that follows the ball (in
// the browser). The board counts in decimetres (Coachboard's format.ts); x from
// the left side line, y from the goal line. One decimal, in the locale's own
// way: "[8,5; 8,7]" in Dutch, where the comma is the decimal sign, and
// "[8.5, 8.7]" in English.
import type { Pt } from "./board/format";

type Locale = "nl" | "en";

const formats: Record<Locale, Intl.NumberFormat> = {
  nl: new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
};

const separator: Record<Locale, string> = { nl: "; ", en: ", " };

/** `pt` (decimetres) in metres, as "[x; y]" or "[x, y]". -0,0 is written 0,0. */
export function point([x, y]: Pt, locale: Locale): string {
  const m = (v: number) => formats[locale].format(Math.round(v) / 10 + 0);
  return `[${m(x)}${separator[locale]}${m(y)}]`;
}
