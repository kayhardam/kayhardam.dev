import type { Text } from "./nl";

// English texts, word for word from the brief, with the typographic apostrophe ’.
// Change a text only after Kay agrees.
export const en: Text = {
  title: "Kay Hardam | PE teacher and handball coach",
  description:
    "I build tools for sports, like Handball Coachboard: a digital tactics board. Watch a play on the board and edit it yourself.",
  ogImage: "Portrait of Kay Hardam beside the KH logo, with kayhardam.dev below.",
  jobTitle: "PE teacher and handball coach",
  site: "kayhardam.dev",
  languages: "Language",
  name: "Kay Hardam",
  hero: {
    button: "Edit this play in Coachboard",
  },
  board: {
    court: "Handball court",
    // counter, steps and ball: a proposal (Hars, 15 November 2026), not yet agreed with Kay.
    counter: "Step {n}/{count}",
    step: "Step {n} of {count}",
    steps: "Steps",
    kinds: { run: "Run", pass: "Pass", shot: "Shot" },
    ball: "ball",
    play: "Play",
    stop: "Stop",
  },
  // figures and lens: a proposal (15 November 2026), not yet agreed with Kay.
  figures: [
    { value: "12/12", rest: "screens with every button in view.", was: "It was 3." },
    { value: "4", rest: "actions to draw a play and share it.", was: "It took 6." },
    { value: "1 px", rest: "is the most the court shifts while it loads.", was: "It was 52 px." },
  ],
  lens: {
    heading: "I measure what the agent delivers.",
    target: "Tap target {name}",
    hint: "Move the lens over the board.",
    label: "Lens over Coachboard’s editor",
    keys: "Move the lens with the arrow keys.",
    image: "Screenshot of Coachboard’s editor on a phone, with a new board.",
  },
  // work, talk and close: a proposal (15 November 2026), not yet agreed with Kay.
  work: {
    heading: "Work",
    items: [{ name: "Coachboard", status: "Live", tech: "Astro · Svelte 5 · TypeScript · Cloudflare Workers" }],
  },
  talk: "Book a call",
  close: {
    heading: "Book a call.",
  },
  notFound: {
    // The 404 page is one page with the Dutch title; this one isn't shown.
    title: "Page not found | Kay Hardam",
    heading: "Page not found",
    text: "The page you were looking for doesn’t exist.",
    home: "Go to the home page",
  },
};
