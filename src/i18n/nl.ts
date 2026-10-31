// Dutch texts, word for word from the brief. Change a text only after Kay agrees.
// Addresses are in src/data/links.ts and src/data/boards.ts, not here, and so is
// the label above the court: the title in the share link.
export const nl = {
  // The <title> and og:title of the home page; the description also goes in og:description.
  // The description is the first mention of Coachboard, so it has the full name,
  // "Handball Coachboard"; after it "Coachboard", and buttons keep it short (Kay, 28 October 2026).
  title: "Kay Hardam | Gymleraar en handbaltrainer",
  description:
    "Ik bouw tools voor sport, zoals Handball Coachboard: een digitaal tactiekbord. Bekijk een aanval op het bord en bewerk hem zelf.",
  // og:image:alt, for public/og.png (one image for both languages).
  ogImage: "Portret van Kay Hardam naast het KH-logo, met daaronder kayhardam.dev.",
  // The jobTitle in the JSON-LD Person: the statement's first sentence without its full stop.
  jobTitle: "Gymleraar en handbaltrainer",
  site: "kayhardam.dev",
  languages: "Taal",
  name: "Kay Hardam",
  // The first sentence light grey, the second white.
  statement: ["Gymleraar en handbaltrainer.", "Ik bouw tools voor sport."],
  hero: {
    button: "Bewerk deze aanval in Coachboard",
  },
  board: {
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
    intro:
      "Een digitaal tactiekbord voor handbal. Teken een spelsituatie in een paar tikken en deel hem via een link of QR-code. Je spelers hebben geen app of account nodig.",
    // Before the link to the tactics, the link, between, the link to the drills, after.
    note: [
      "Gebouwd vanuit de praktijk als handbaltrainer. Blader door ",
      "tactieken",
      " en ",
      "oefeningen",
      ", elk met een tekening die je opent in het bord. Heb je zelf een oefening die erin hoort? Mail hem me.",
    ],
    // The arrow after it is an SVG: U+2192 isn't in Barlow's Latin subset.
    button: "Naar Coachboard",
  },
  about: {
    heading: "Over mij",
    photo: "Portret van Kay Hardam.",
    // The two big sentences (Kay, 31 October 2026).
    text: [
      "Hoi, ik ben Kay. Ik help je handbal zo uit te leggen dat je hele team het snapt.",
      "Ik ben gymleraar, handbaltrainer, en ik bouw software als de zaal dicht is.",
    ],
    // Before the link to Coachboard, the link, after. The address is `coachboard` in src/data/links.ts.
    product: ["Ik maak ", "Coachboard", ": een digitaal tekenbord voor als handen en voeten niet genoeg zijn."],
    example: "Een aanval tegen een 6-0? Drie pijlen, en je spelers snappen wat je bedoelt.",
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
