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
  // The jobTitle in the JSON-LD Person, as in the title: the page itself no longer says it (phase 11).
  jobTitle: "Gymleraar en handbaltrainer",
  site: "kayhardam.dev",
  languages: "Taal",
  name: "Kay Hardam",
  hero: {
    // The link under the step lines: it opens the attack in Coachboard.
    button: "Bewerk deze aanval in Coachboard",
  },
  board: {
    court: "Handbalveld",
    // The counter above the sentence, as Kay wrote it: "Stap n/4" (Hars, 15 November 2026).
    counter: "Stap {n}/{count}",
    // For screen readers, in place of the visible counter; {n} and {count} as in Coachboard's viewer.step.
    step: "Stap {n} van {count}",
    // The list of step lines, for screen readers.
    steps: "Stappen",
    // One text per kind of arrow, in the step lines; a kind without a text stops the build.
    kinds: { run: "Loop", pass: "Pass", shot: "Schot" },
    // The label that follows the ball: "bal [x; y]", in metres (Kay: "bal [x, y]").
    ball: "bal",
    // The play button is an icon, with these as aria-label and title.
    play: "Afspelen",
    stop: "Stoppen",
  },
  // The three figures under the hero, word for word from Kay (Hars, 15 November 2026). The
  // figure counts up from 0 to its first number; each links to its evidence (src/data/links.ts).
  figures: [
    { value: "12/12", rest: "schermen met elke knop in beeld.", was: "Dat waren er 3." },
    { value: "4", rest: "handelingen om een aanval te tekenen en te delen.", was: "Dat waren er 6." },
    { value: "1 px", rest: "verspringt het veld hooguit bij het laden.", was: "Dat was 52 px." },
  ],
  // The lens over Coachboard's editor (Hars). heading, target and hint from Kay; target's
  // {name} is a measured target's name (src/data/tap-targets.json). label, keys and image:
  // a proposal (15 November 2026), not yet agreed with Kay.
  lens: {
    heading: "Ik meet wat de agent oplevert.",
    target: "Tikvlak {name}",
    hint: "Ga met de lens over het bord.",
    label: "Lens over de editor van Coachboard",
    keys: "Verplaats de lens met de pijltjestoetsen.",
    image: "Schermafbeelding van de editor van Coachboard op een telefoon, met een nieuw bord.",
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
    // The arrow after it is an SVG: U+2192 isn't in the font's Latin subset.
    button: "Naar Coachboard",
  },
  about: {
    heading: "Over mij",
    photo: "Portret van Kay Hardam.",
    // The big sentence (Kay, 31 October 2026). The second one, with the club, and the
    // example after the product went in phase 11 (Kay, 5 November 2026).
    text: ["Hoi, ik ben Kay. Ik help je handbal zo uit te leggen dat je hele team het snapt."],
    // Before the link to Coachboard, the link, after. The address is `coachboard` in src/data/links.ts.
    product: ["Ik maak ", "Coachboard", ": een digitaal tekenbord voor als handen en voeten niet genoeg zijn."],
  },
  contact: {
    heading: "Contact",
    question: "Ben je zelf trainer? Ik hoor graag wat je van Coachboard vindt.",
    // The email address follows as its own, large link.
    mail: "Ook voor vragen of ideeën. Mail me:",
  },
  // The footer under Contact (phase 11, Kay's choice): one line, then the links.
  // Before the link, the link, after it. LinkedIn comes later (Kay, 5 November 2026).
  footer: {
    line: "Gebouwd als de zaal dicht is.",
    github: ["Code op ", "GitHub", "."],
  },
  notFound: {
    title: "Pagina niet gevonden | Kay Hardam",
    heading: "Pagina niet gevonden",
    text: "De pagina die je zocht bestaat niet.",
    home: "Naar de startpagina",
  },
};

export type Text = typeof nl;
