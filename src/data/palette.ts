// The palette the site is in (src/styles/tokens.css): BaseLayout.astro puts it on <html>,
// and the parts every page shares take their colours from it. "inkt" since the holding page
// (Kay, 20 November 2026). "hars" is the full page's: to bring that page back, set it here
// too (AGENTS.md, "The holding page").
export type Palette = "inkt" | "hars";

export const palette: Palette = "inkt";
