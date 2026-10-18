import { en } from "./en";
import { nl, type Text } from "./nl";

// The languages in the order of the language switch. Dutch is on /, English on /en/.
export const locales = ["nl", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "nl";

const texts: Record<Locale, Text> = { nl, en };

/** The texts of a language; the default language for anything else. */
export function text(locale: string | undefined): Text {
  return texts[locale as Locale] ?? texts[defaultLocale];
}
