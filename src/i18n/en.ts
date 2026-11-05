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
  statement: ["I coach.", "I code."],
  hero: {
    button: "Edit this play in Coachboard",
  },
  board: {
    court: "Handball court",
    step: "Step {n} of {count}",
    legend: "Legend",
    kinds: { run: "Run", pass: "Pass", shot: "Shot" },
    prev: "Previous",
    play: "Play",
    stop: "Stop",
    next: "Next",
  },
  coachboard: {
    heading: "Coachboard",
    intro:
      "A digital tactics board for handball. Draw a play in a few taps and share it with a link or QR code. Your players don’t need an app or account.",
    note: [
      "Built from my own experience as a handball coach. Browse ",
      "tactics",
      " and ",
      "drills",
      ", each with a diagram you can open in the board. Got a drill that belongs in there? Email me.",
    ],
    button: "Go to Coachboard",
  },
  about: {
    heading: "About me",
    photo: "Portrait of Kay Hardam.",
    text: ["Hi, I’m Kay. I help you explain handball so your whole team gets it."],
    product: ["I make ", "Coachboard", ": a digital drawing board for when hands and feet aren’t enough."],
  },
  contact: {
    heading: "Contact",
    question: "Are you a coach yourself? I’d love to hear what you think of Coachboard.",
    mail: "Questions or ideas are welcome too. Email me:",
  },
  footer: {
    line: "Built when the gym is closed.",
    github: ["Code on ", "GitHub", "."],
  },
  notFound: {
    // The 404 page is one page with the Dutch title; this one isn't shown.
    title: "Page not found | Kay Hardam",
    heading: "Page not found",
    text: "The page you were looking for doesn’t exist.",
    home: "Go to the home page",
  },
};
