// Dutch texts, word for word from the brief. Change a text only after Kay agrees.
// Addresses are in src/data/links.ts and src/data/boards.ts, not here.
export const nl = {
  // The <title> and og:title of the home page; the description also goes in og:description.
  title: "Kay Hardam | Gymleraar en handbaltrainer",
  description:
    "Ik bouw tools voor sport en onderwijs, zoals Coachboard: een digitaal tactiekbord voor handbal. Bekijk een aanval op het bord en bewerk hem zelf.",
  site: "kayhardam.dev",
  languages: "Taal",
  name: "Kay Hardam",
  // The first sentence light grey, the second white.
  statement: ["Gymleraar en handbaltrainer.", "Ik bouw tools voor sport en onderwijs."],
  hero: {
    button: "Bewerk deze aanval in Coachboard",
  },
  board: {
    // Above the court: the share link has no title, on purpose.
    label: "Kruising MO–LO",
    court: "Handbalveld",
    // For screen readers, after the visible "1/4"; {n} and {count} as in Coachboard's viewer.step.
    step: "Stap {n} van {count}",
    legend: "Legenda",
    // One text per kind of arrow in the legend; a kind without a text stops the build.
    kinds: { run: "Loop", pass: "Pass", shot: "Schot" },
    // The buttons are icons only, with these as aria-label and title.
    prev: "Vorige",
    play: "Afspelen",
    // From phase 5, when the board plays.
    stop: "Stoppen",
    next: "Volgende",
  },
  coachboard: {
    heading: "Coachboard",
    text: [
      "Een digitaal tactiekbord voor handbal. Teken een spelsituatie in een paar tikken en deel hem via een link of QR-code. Je spelers hebben geen app of account nodig.",
      "Gebouwd vanuit de praktijk als handbaltrainer. Ik werk nu aan een bibliotheek waar trainers hun kennis delen.",
    ],
    // The arrow after it is an SVG: U+2192 isn't in Barlow's Latin subset.
    button: "Naar Coachboard",
  },
  about: {
    heading: "Over mij",
    photo: "Portret van Kay Hardam.",
    text: [
      "Hoi, ik ben Kay. Overdag sta ik in de gymzaal, in het weekend langs de lijn bij\u00A0HV\u00A0Unitas\u00A0in\u00A0Rolde.",
      "En soms bouw ik dingen die ik zelf nodig heb, zoals Coachboard.",
    ],
    example: "Wat ik bouw, moet je snappen zonder uitleg. Een aanval tegen een 6-0? Drie pijlen, en je spelers snappen wat je bedoelt.",
  },
  contact: {
    heading: "Contact",
    question: "Ben je zelf trainer? Ik hoor graag wat je van Coachboard vindt.",
    // The email address follows as its own, large link.
    mail: "Ook voor vragen of ideeën. Mail me:",
    // Before the link, the link, after it.
    github: ["Mijn code staat op ", "GitHub", "."],
  },
  notFound: {
    title: "Pagina niet gevonden | Kay Hardam",
    heading: "Pagina niet gevonden",
    text: "De pagina die je zocht bestaat niet.",
    home: "Naar de startpagina",
  },
};

export type Text = typeof nl;
