// The palette the site is in (src/styles/tokens.css): BaseLayout.astro puts it on <html>,
// and the parts every page shares take their colours from it. "oranje" since the landing page
// (Kay, 25 November 2026). "inkt" is the holding page's, "hars" the full page's: to bring one of
// them back, set its palette here too (AGENTS.md).
export type Palette = "oranje" | "inkt" | "hars";

export const palette: Palette = "oranje";
