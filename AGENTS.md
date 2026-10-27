# kayhardam.dev

Kay Hardam's personal landing page, https://kayhardam.dev: a static Astro 7 site in Dutch (`/`) and English (`/en/`). The products come first: the hero is Coachboard's board, playing a shared board. `CLAUDE.md` is a symlink to this file.

Everything in `docs/` stays local and is not in the repo: the build brief (`docs/kayhardam-dev-brief.md`), the plan per phase and the status. The one exception is `docs/metingen.md` (`.gitignore`: `docs/*` with one exception). The brief holds the agreed texts, the design and the phases.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port **4322** (not 4321: Coachboard's may run at the same time). |
| `npm run verify` | What CI runs (`.github/workflows/ci.yml`, on pull requests and pushes to `main`): `astro check` and `svelte-check --fail-on-warnings` → `vitest run` → `astro build` → `node scripts/check-links.mjs` → `node scripts/check-budget.mjs`. Must be green before every commit. |
| `npm run budget` | The size budgets against the current `dist/` (run `npm run build` first). |
| `npm run e2e` | End-to-end tests (Playwright) in mobile Chromium and WebKit. Builds, then serves `dist/` with `wrangler dev` on port **8788** (not 8787: Coachboard's e2e tests may run at the same time). A separate CI job, not part of `verify`. First time: `npx playwright install chromium webkit`. |
| `E2E_BASE_URL=https://<url> npx playwright test e2e/security.spec.ts` | An e2e file against a deployed site (a preview URL, or production: `https://kayhardam.dev`) instead of `wrangler dev`. Run `npm run build` on that commit first: the page list comes from `dist/`. |
| `npm run build && node scripts/og-image.mjs` | The share image `public/og.png`, on the Mac; then commit it. Run it again only when the photo, the logo, the colours or the font change. |
| `node scripts/favicons.mjs` | `public/favicon.ico` and `public/apple-touch-icon.png` from `public/favicon.svg`, on the Mac; then commit them, and make `og.png` again. |
| `node scripts/clean-photo.mjs "screenshots/foto/<original>.jpg" src/assets/kay-hardam.jpg` | The clean copy of the photo, on the Mac; then commit it. Run it again for a new photo. It stops, and writes nothing, on a photo that is not a square sRGB JPEG standing upright. |

Commit only when `npm run verify` exits with code 0. Check the exit code itself, not the output: a pipe through `tail` or `head` hides a failure. Always run verify and the commit as one command, joined with `&&`, for example `npm run verify && git commit -m "…"`: then a red verify never makes a commit.

## Way of working

- One branch (`fase-N-<name>`) and one pull request per phase. Kay merges after his own check, with a plain merge.
- No attribution to Claude in this repo: no Co-Authored-By line in commits and no "Generated with Claude Code" in pull requests (Kay, 17 October 2026). `.claude/settings.json` turns it off for this project only; Coachboard keeps it.
- Never `git add -A` or `git add .`: add files by name. A new local folder (screenshots, measurements, scratch files) goes in `.gitignore` first, before anything is added (Kay, 18 October 2026: screenshots ended up in PR #3 that way).
- Claude Code never deploys. Cloudflare Workers Builds deploys `main` after a merge and gives every branch a preview URL.
- Texts come word for word from the brief. A new or changed text is agreed with Kay first; a missing text is asked for, never made up.
- Measurements (sizes, Lighthouse) go in `docs/metingen.md`, per phase. Lighthouse runs twice: simulated and with `--throttling-method=devtools`.

## Structure

- `README.md` is for visitors on GitHub, in English: what the site is and how it is made. A change to it is agreed with Kay first, like the other texts.
- `LICENSE`: MIT, "Copyright (c) 2026 Kay Hardam", for the code. The texts, the logo and the photo are not part of it (the README says so).
- `.node-version` holds `22`, the Node version for Workers Builds and local work; CI sets 22 in `.github/workflows/ci.yml`. Change both together.
- `src/pages/index.astro` (Dutch) and `src/pages/en/index.astro` render `src/components/Home.astro`; the language comes from `Astro.currentLocale`.
- `src/pages/404.astro` is one page for every missing URL, Dutch first, then English, with the Dutch title. `wrangler.jsonc` serves it with status 404.
- Texts: `src/i18n/nl.ts` and `src/i18n/en.ts` (the type comes from `nl.ts`, so a text missing in English fails `astro check`); `text(locale)` in `src/i18n/index.ts`.
  - `coachboard.note` is the paragraph with the links to Coachboard's tactics and drills, in five parts: before, the link, between, the link, after. The addresses are `tactics` and `drills` in `src/data/links.ts`.
  - In `about.text[0]` there are hard spaces (U+00A0, `\u00A0` in the source) between the words of "bij HV Unitas in Rolde" and "at HV Unitas in Rolde", so the club stays on one line (Kay, phase 8). `texts.test.ts` and `e2e/page.spec.ts` fail without them.
- `src/layouts/BaseLayout.astro`: `lang`, canonical, hreflang (nl, en, and x-default to `/en/`, Kay's choice), the preload of Barlow Condensed 700, the description and Open Graph (`og:title` and `og:description` are the title and the description; `og:image` is `/og.png`, one for both languages, with `og:image:alt`), and a JSON-LD Person (`name`, `jobTitle`, `url` the canonical, `sameAs` GitHub and `https://handballcoachboard.com/`). The 404 page is `noindex`, without canonical, hreflang, description, Open Graph or JSON-LD. The texts are `title`, `description`, `ogImage` and `jobTitle` in `nl.ts` and `en.ts`. The GitHub link in Contact has `rel="me"`, the page's only `rel` on a link.
- `@astrojs/sitemap` (`astro.config.mjs`) writes `sitemap-index.xml` and `sitemap-0.xml` with `/` and `/en/`, each with hreflang nl and en; it leaves the 404 out by itself. `src/pages/robots.txt.ts` points to it. Both after Coachboard (commit `88a58a4`).
- The share image, `public/og.png` (1200 × 630, navy, RGB without alpha or palette, no metadata), comes from `scripts/og-image.mjs`: Kay's photo (260 px, round with a white edge of 8 px) and 48 px beside it the KH logo as in the header, white with a navy label (210 px); 34 px below them `KAYHARDAM.DEV` as in the header (64 px). In the exact middle, well inside the square x 285–915 that WhatsApp shows compactly (Kay, 27 October 2026: the photo, not the board, so one image for both languages). The photo is the clean copy in `src/assets/`. The letter-spacing is on the text only, never on the logo's SVG ("K H"). It reads `dist/` with Playwright, without a server. Not part of the build: Workers Builds has no Chromium, and `system-ui` (the label KH) differs per machine. `check-budget.mjs` has a budget for it, raw.
- The favicons: `favicon.svg` and `favicon.ico` are navy with a white edge, so they show on light and on dark tabs. The touch icon and `og.png` have the header's white player (phase 8).
- About me has the photo (phase 7): `src/assets/kay-hardam.jpg` with `<Picture>` from `astro:assets` in `Home.astro`.
  - The copy is clean: square, at most 900 px, without metadata (`src/assets/photo.test.ts`). `scripts/clean-photo.mjs` makes it; the original stays outside git, in `screenshots/foto/`.
  - AVIF and WebP in `<source>`s, JPEG in the `<img>`; widths 300, 600 and 900 (Astro makes none larger than the original, now 799 px); `sizes="min(300px, 70vw)"`, `width` and `height` 300, `loading="lazy"`, `decoding="async"`. The alt text is `about.photo` in `nl.ts` and `en.ts`.
  - Round, like a player, with a white edge of 5 px. From 860 px beside the text (300 px, 64 px between, centred vertically); on the phone above it (`min(300px, 70vw)`, 40 px to number 2). `e2e/photo.spec.ts` tests all of it, also which file Chromium and WebKit choose.
- The hero has the photo too (phase 8): 64 px with a white edge of 3 px, 16 px before the name, `alt=""` (the name is beside it); widths 64, 128 and 192 with `sizes="64px"`, `loading="eager"`. `e2e/photo.spec.ts` tests both photos. `e2e/board-box.spec.ts` tests that the photo and the name are on the first screen in the Pixel 7's window (412 × 839); not in project `iphone`, as in Safari they fall just below the edge (Kay, phase 8). At 390 × 844, a phone's whole screen, the name and the statement's first line are on it too (Kay, 27 October 2026), in both projects.
- Styles: `src/styles/tokens.css` (navy, white and grey; green only for the board's card; the breakpoints 560 and 860 px) and `src/styles/base.css`.
- The board in the hero (`src/components/board/`):
  - `src/data/boards.ts` holds the two Coachboard share links, the contract for the board, its label and the hero button. The label above the court is the link's title ("Kruising MO–LO", "Crossing CB–LB"), so Coachboard opens the board with it too. `boardFrom()` decodes a link at build time with Coachboard's `decode()`; a broken link, a link without a title, or a legend item without a text, stops the build. A new link is made with `encode()` from the copy of `format.ts`, which is Coachboard's.
  - `Board.astro` decodes the link and makes the legend; `BoardCard.svelte` draws the card; `Court.svelte` draws the court.
  - `BoardCard.svelte` is the one island (`client:visible`). It gets the decoded board as props, so the browser never decodes the link. On the server and in its first render it is the card without JavaScript (step 1, the buttons `disabled`), so hydrating changes no element. Once mounted it plays by itself in a loop, except with reduced motion; it pauses out of view and in a hidden tab. `aria-live` on the sentence is `off` while it plays by itself and `polite` once it stands still (Kay's decision, phase 5); Previous and Next set it before the sentence changes, with Svelte's `tick()` in between. A button with nothing to do is `aria-disabled`. `e2e/play.spec.ts` tests all of it with Playwright's clock.
  - The styles are in `board.css`, global, every rule under `.board`. Its formula for the card's height is checked by `e2e/board-box.spec.ts`.

## Rules

- **Trailing slash everywhere** (`trailingSlash: "always"`). Build links with `getRelativeLocaleUrl()` from `astro:i18n`.
- **No JavaScript on the page**, except the board: one Svelte 5 island, `BoardCard` with `client:visible`, and Astro's two inline scripts for it. `scripts/check-budget.mjs` fails on a second island, another island or directive, an island on the 404 page, an inline `<script>` without the island, any `<script src>` and any modulepreload. Its JS budget counts the island's files and what they import (gzip); lazy JS has a budget of 0. The JSON-LD is a data block, not JavaScript: `check-budget.mjs` allows it.
- **CSP:** everything `'self'`. Astro writes the `<meta>` with hashes for its inline scripts and styles (`security.csp` in `astro.config.mjs`); `public/_headers` has `frame-ancestors 'none'` and the other security headers. Nothing loads from another origin: `e2e/security.spec.ts` checks every page.
- **Photos:** only through `astro:assets` from `src/assets/`, never in `public/` (the one exception is the photo inside `og.png`, which `og-image.mjs` takes from the clean copy); the source first through `scripts/clean-photo.mjs` (`src/assets/photo.test.ts` fails on metadata). No `layout` on `<Picture>` and no `image.layout`: those put CSS in the page. A photo has `aspect-ratio` in the CSS: without it WebKit collapses a failed image. `check-budget.mjs` measures every file in a `src` or `srcset`, with a budget per format, and fails on a missing one (`check-links.mjs` doesn't read `srcset`).
- **Colour:** colour comes only from the photo and from the board's card (`BoardCard.svelte`, `Court.svelte`, `board.css`). The rest is navy, white and grey, with the tokens in `tokens.css` (Kay, phase 8). `src/styles/colours.test.ts` fails on green anywhere else. The focus ring is `--color-text-small`: 3:1 on navy, `#1E293B`, white and the card.
- **Fonts:** Barlow Condensed 600 and 700, Latin only, self-hosted through `@fontsource/barlow-condensed`. Running text is `system-ui`.
- **Touch targets:** links and buttons at least 44 px high (`e2e/a11y.spec.ts`), a visible focus ring, contrast WCAG AA (axe). A link in running text (tactics and drills in the Coachboard section) is `inline-block` with 9 px of padding and a margin of −9 px: 45 px high, without making its line higher.
- **Hosting:** `wrangler.jsonc` serves `dist/` as static assets, on Worker `kayhardam-site`.
  - Workers Builds makes the photo's images at the build, with sharp. sharp is in `devDependencies` and an optional dependency of Astro: don't remove it, and never install with `--omit=optional`. Without sharp the build fails (`MissingSharp`), and nothing deploys.
  - Its `routes` entry attaches `kayhardam.dev` as a Custom Domain (phase 6). Keep it there and don't manage the domain only in the dashboard: a deploy whose config lacks it removes the domain again.
  - The deploy takes a domain over from another Worker without asking: Workers Builds runs wrangler without a terminal. That is how `kayhardam.dev` moved from Worker `kayhardam-dev` (the placeholder) at the launch. `wrangler preview` publishes no routes, so a branch never touches the domain.
  - `workers_dev` stays `false` and `preview_urls` `true`: no workers.dev address, a preview URL per branch.
  - Worker `kayhardam-dev`, the placeholder, is gone: Kay deleted it after the production checks of phase 6 (21 October 2026). There is no way back to it.
  - **Set in the Cloudflare dashboard**, not in this repo:
    - Always Use HTTPS on;
    - Email Address Obfuscation off, so Cloudflare doesn't rewrite the email address or inject a script the CSP would block;
    - Web Analytics off: no statistics (Kay), and an injected beacon would land above the CSP `<meta>`;
    - www: a DNS record `AAAA www 100::` (proxied) and a Redirect Rule to the bare domain, keeping the path and the query (a Custom Domain matches one exact hostname);
    - Email Routing forwards `hallo@kayhardam.dev` to Kay's own address;
    - if Kay turns on Google Search Console: leave its TXT record, or the verification lapses.
- Code taken from Coachboard says so in a comment at the top, with the commit. Take it with `git show <commit>:<path>` in the Coachboard repo, never from its working tree: another session may be working there.
- **The copies from Coachboard stay unchanged** (commit `4ceafd4`): `Court.svelte` (one change: the optional prop `viewBox`), `src/lib/board/{format,geometry,moves,play,viewer}.ts`, `src/lib/viewerIcons.ts`, the tests `geometry.test.ts` and `moves.test.ts`, and `svelte.config.js`. `src/lib/board/edit.ts` has only the type `Selection`. `src/lib/coachboard.test.ts` compares each copy's SHA-256 with the original. To take a newer version, copy it again with `git show` and update the hash and the commit.
