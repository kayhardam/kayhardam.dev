import type { Text } from "./nl";

// English texts, word for word from the brief, with the typographic apostrophe ’.
// Change a text only after Kay agrees.
export const en: Text = {
  title: "Kay Hardam | PE teacher and handball coach",
  description:
    "I build tools for sports and education, like Coachboard: a digital tactics board for handball. Watch a play on the board and edit it yourself.",
  site: "kayhardam.dev",
  languages: "Language",
  name: "Kay Hardam",
  statement: ["PE teacher and handball coach.", "I build tools for sports and education."],
  hero: {
    button: "Edit this play in Coachboard",
  },
  board: {
    label: "Crossing CB–LB",
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
    text: [
      "A digital tactics board for handball. Draw a play in a few taps and share it with a link or QR code. Your players don’t need an app or account.",
      "Built from my own experience as a handball coach. I’m now working on a library where coaches share what they know.",
    ],
    button: "Go to Coachboard",
  },
  about: {
    heading: "About me",
    photo: "Portrait of Kay Hardam.",
    text: [
      "Hi, I’m Kay. By day I’m in the gym, on weekends I’m on the sideline.",
      "The rest of the time I build things. Just because I enjoy it.",
    ],
    example: "What I build should make sense without explaining. A play against a 6-0 defense in Coachboard? Three arrows, and your players get what you mean.",
  },
  contact: {
    heading: "Contact",
    question: "Are you a coach yourself? I’d love to hear what you think of Coachboard.",
    mail: "Questions or ideas are welcome too. Email me:",
    github: ["My code is on ", "GitHub", "."],
  },
  notFound: {
    // The 404 page is one page with the Dutch title; this one isn't shown.
    title: "Page not found | Kay Hardam",
    heading: "Page not found",
    text: "The page you were looking for doesn’t exist.",
    home: "Go to the home page",
  },
};
