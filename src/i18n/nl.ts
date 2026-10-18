// Dutch texts, word for word from the brief. Change a text only after Kay agrees.
// Addresses are in src/data/links.ts and src/data/boards.ts, not here.
export const nl = {
  // Until phase 6, when every page gets its own title and description.
  title: "kayhardam.dev",
  site: "kayhardam.dev",
  languages: "Taal",
  name: "Kay Hardam",
  // The first sentence light grey, the second white.
  statement: ["Gymleraar en handbaltrainer.", "Ik bouw tools voor sport en onderwijs."],
  hero: {
    button: "Bewerk deze aanval in Coachboard",
  },
  coachboard: {
    heading: "Coachboard",
    text: [
      "Een digitaal tactiekbord voor handbal. Teken een spelsituatie in een paar tikken en deel hem via een link of QR-code. Je spelers hebben geen app of account nodig.",
      "Gebouwd vanuit de praktijk als handbaltrainer. Ik werk er actief aan.",
    ],
    // The arrow after it is an SVG: U+2192 isn't in Barlow's Latin subset.
    button: "Naar Coachboard",
  },
  about: {
    heading: "Over mij",
    text: [
      "Ik ben gaan bouwen omdat ik het leuk vind. Ideeën genoeg: in de gymzaal en langs de lijn zie ik vaak wat handiger kan.",
      "Wat ik belangrijk vind: dat het klopt voor degene die het gebruikt.",
    ],
    example: "Daarom tel ik in Coachboard elke tik. Een aanval tegen een 6-0? Drie pijlen trekken en delen. Meer is het niet.",
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
