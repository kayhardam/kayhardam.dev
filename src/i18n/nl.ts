// Dutch texts, word for word from the brief. Change a text only after Kay agrees.
export const nl = {
  // Until phase 6, when every page gets its own title and description.
  title: "kayhardam.dev",
  site: "kayhardam.dev",
  languages: "Taal",
  name: "Kay Hardam",
  // The first sentence light grey, the second white.
  statement: ["Gymleraar en handbaltrainer.", "Ik bouw tools voor sport en onderwijs."],
  notFound: {
    title: "Pagina niet gevonden | Kay Hardam",
    heading: "Pagina niet gevonden",
    text: "De pagina die je zocht bestaat niet.",
    home: "Naar de startpagina",
  },
};

export type Text = typeof nl;
