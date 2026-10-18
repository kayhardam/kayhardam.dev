# kayhardam.dev

Kay Hardam's personal landing page: a static Astro 7 site in Dutch (`/`) and English (`/en/`). The products come first: the hero will be Coachboard's board, playing a shared board. `CLAUDE.md` is a symlink to this file.

The build brief (`docs/kayhardam-dev-brief.md`) stays local and is not in the repo (`.gitignore`). It holds the agreed texts, the design and the phases.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port **4322** (not 4321: Coachboard's may run at the same time). |
| `npm run verify` | What CI runs (`.github/workflows/ci.yml`, on pull requests and pushes to `main`): `astro check` and `svelte-check --fail-on-warnings` → `vitest run` → `astro build` → `node scripts/check-links.mjs` → `node scripts/check-budget.mjs`. Must be green before every commit. |
| `npm run budget` | The size budgets against the current `dist/` (run `npm run build` first). |
| `npm run e2e` | End-to-end tests (Playwright) in mobile Chromium and WebKit. Builds, then serves `dist/` with `wrangler dev` on port **8788** (not 8787: Coachboard's e2e tests may run at the same time). A separate CI job, not part of `verify`. First time: `npx playwright install chromium webkit`. |
| `E2E_BASE_URL=https://<url> npx playwright test e2e/security.spec.ts` | An e2e file against a deployed site (a preview URL) instead of `wrangler dev`. Run `npm run build` on that commit first: the page list comes from `dist/`. |

Commit only when `npm run verify` exits with code 0. Check the exit code itself, not the output: a pipe through `tail` or `head` hides a failure. Always run verify and the commit as one command, joined with `&&`, for example `npm run verify && git commit -m "…"`: then a red verify never makes a commit.

## Way of working

- One branch (`fase-N-<name>`) and one pull request per phase. Kay merges after his own check, with a plain merge.
- No attribution to Claude in this repo: no Co-Authored-By line in commits and no "Generated with Claude Code" in pull requests (Kay, 17 October 2026). `.claude/settings.json` turns it off for this project only; Coachboard keeps it.
- Never `git add -A` or `git add .`: add files by name. A new local folder (screenshots, measurements, scratch files) goes in `.gitignore` first, before anything is added (Kay, 18 October 2026: screenshots ended up in PR #3 that way).
- Claude Code never deploys. Cloudflare Workers Builds deploys `main` after a merge and gives every branch a preview URL.
- Texts come word for word from the brief. A new or changed text is agreed with Kay first; a missing text is asked for, never made up.
- Measurements (sizes, Lighthouse) go in `docs/metingen.md`, per phase. Lighthouse runs twice: simulated and with `--throttling-method=devtools`.

## Structure

- `src/pages/index.astro` (Dutch) and `src/pages/en/index.astro` render `src/components/Home.astro`; the language comes from `Astro.currentLocale`.
- `src/pages/404.astro` is one page for every missing URL, Dutch first, then English, with the Dutch title. `wrangler.jsonc` serves it with status 404.
- Texts: `src/i18n/nl.ts` and `src/i18n/en.ts` (the type comes from `nl.ts`, so a text missing in English fails `astro check`); `text(locale)` in `src/i18n/index.ts`.
- `src/layouts/BaseLayout.astro`: `lang`, canonical, hreflang (nl, en, and x-default to `/en/`, Kay's choice), the preload of Barlow Condensed 700.
- Styles: `src/styles/tokens.css` (Coachboard's colours, the breakpoints 560 and 860 px) and `src/styles/base.css`.
- The board in the hero (`src/components/board/`):
  - `src/data/boards.ts` holds the two Coachboard share links, the contract for the board and the hero button. `boardFrom()` decodes a link at build time with Coachboard's `decode()`; a broken link, or a legend item without a text, stops the build.
  - `Board.astro` decodes the link and makes the legend; `BoardCard.svelte` draws the card; `Court.svelte` draws the court. Svelte renders at build time only (no `client:`) until phase 5 gives `BoardCard.svelte` `client:visible`.
  - The styles are in `board.css`, global, every rule under `.board`. Its formula for the card's height is checked by `e2e/board-box.spec.ts`.

## Rules

- **Trailing slash everywhere** (`trailingSlash: "always"`). Build links with `getRelativeLocaleUrl()` from `astro:i18n`.
- **No JavaScript on the page**, except (from phase 5) the board: one Svelte 5 island. `scripts/check-budget.mjs` fails on any `<script>`, `<astro-island>` or modulepreload.
- **CSP:** everything `'self'`. Astro writes the `<meta>` with hashes for its inline styles (`security.csp` in `astro.config.mjs`); `public/_headers` has `frame-ancestors 'none'` and the other security headers. Nothing loads from another origin: `e2e/security.spec.ts` checks every page.
- **Fonts:** Barlow Condensed 600 and 700, Latin only, self-hosted through `@fontsource/barlow-condensed`. Running text is `system-ui`.
- **Touch targets:** links and buttons at least 44 px high (`e2e/a11y.spec.ts`), a visible focus ring, contrast WCAG AA (axe).
- **Hosting:** `wrangler.jsonc` serves `dist/` as static assets. No `routes` until the launch (phase 6): `kayhardam.dev` still shows the placeholder. The site runs on its own Worker, `kayhardam-site`; the placeholder on `kayhardam.dev` and `www` is Worker `kayhardam-dev`. In phase 6 the domain moves from Worker `kayhardam-dev` to `kayhardam-site`.
- Code taken from Coachboard says so in a comment at the top, with the commit. Take it with `git show <commit>:<path>` in the Coachboard repo, never from its working tree: another session may be working there.
- **The copies from Coachboard stay unchanged** (commit `4ceafd4`): `Court.svelte` (one change: the optional prop `viewBox`), `src/lib/board/{format,geometry,moves,play,viewer}.ts`, `src/lib/viewerIcons.ts`, the tests `geometry.test.ts` and `moves.test.ts`, and `svelte.config.js`. `src/lib/board/edit.ts` has only the type `Selection`. `src/lib/coachboard.test.ts` compares each copy's SHA-256 with the original. To take a newer version, copy it again with `git show` and update the hash and the commit.
