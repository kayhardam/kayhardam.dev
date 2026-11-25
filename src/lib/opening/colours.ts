// The colours of the opening's 3D scene (scene.ts), as numbers for three.js: Kay's choice in
// the mockup (25 November 2026). The hall has Coachboard's light court and the home colour of
// the Dutch handball team: an orange attack against a dark blue defence, a blue ball, and the
// keeper in Coachboard's green, apart from both teams. The orange is a shade darker than the
// shirt, so a disc is 3.2:1 on the court. On the board at the end the attack and the ball take
// Coachboard's own colours (END), the ones Court.svelte draws: the board in the scene is the
// board that fades in over it, and the one the button opens.
//
// A three.js material can't read a custom property, so the scene has its own colours: the only
// file with colours outside tokens.css and Court.svelte's copy (src/styles/colours.test.ts).
// colours.test.ts here holds the ones the scene shares with the tokens and with Court.svelte.
export const SCENE = {
  ground: 0xf8fafc, // the floor around the court and the sky: the page's ground, krijt
  court: 0xf1f5f9, // Court.svelte's court
  goalArea: 0xdbe4ee, // Court.svelte's goal area
  lines: 0x64748b, // Court.svelte's lines
  wall: 0xe8edf3,
  wood: 0xd9bf98, // the wall bars
  skin: 0xe4c9ad,
  shoe: 0x1c1714,
  hair: [0x2b211b, 0x6b4a2f, 0x1c1714, 0x8a6a45, 0x3a2a20],
  attack: 0xea580c, // oranje
  attackLegs: 0xc2410c, // oranje-donker
  attackLabel: 0x0f172a, // marine on oranje: 5.0:1
  defense: 0x0f172a, // marine: Court.svelte's defence
  defenseLegs: 0x1e293b,
  defenseLabel: 0xffffff,
  keeper: 0x15803d, // Coachboard's green: Court.svelte's attack
  ball: 0x2563eb,
  ballEdge: 0x0f172a,
  discEdge: 0xffffff,
  trail: 0x0f172a, // Court.svelte's ink: the arrows
  trailInner: 0xffffff,
  posts: 0x0f172a, // the goal's bands, with white
  band: 0xffffff,
  bandGlow: 0x7a7a7a, // so the white bands stay white in the hall's light
  frame: 0x94a3b8, // the goal's floor frame and net bows
  net: 0xffffff,
  shadow: 0x0f172a,
  scoreboard: 0x0f172a,
  scoreText: 0xffffff,
  scoreHome: 0xea580c,
  sky: 0xffffff, // the hemisphere light
  floorLight: 0xe9e2d6,
  sun: 0xfff4e6,
} as const;

/** Coachboard's colours for the attack and the ball, as Court.svelte draws them: the board at the end. */
export const END = {
  attack: 0x15803d,
  attackLabel: 0xffffff,
  ball: 0xf59e0b,
  ballEdge: 0x78350f,
} as const;

/** A colour as CSS writes it, for a canvas. */
export const css = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
