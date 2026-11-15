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
  // The work (Hars, 15 November 2026): each project, its status and the technique
  // behind it. Movva and Coachboard Lite come later (Kay). The technique: a proposal,
  // agreed with Kay on 15 November 2026.
  work: {
    heading: "Werk",
    items: [{ name: "Coachboard", status: "Live", tech: "Astro · Svelte 5 · TypeScript · Cloudflare Workers" }],
  },
  // The button in the header and the close: one goal, a conversation (Kay). The line
  // about availability comes later (Kay, 15 November 2026).
  talk: "Plan een gesprek",
  close: {
    heading: "Plan een gesprek.",
  },
  notFound: {
    title: "Pagina niet gevonden | Kay Hardam",
    heading: "Pagina niet gevonden",
    text: "De pagina die je zocht bestaat niet.",
    home: "Naar de startpagina",
  },
};

export type Text = typeof nl;
