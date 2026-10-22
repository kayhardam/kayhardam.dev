# kayhardam.dev

Kay Hardam's personal landing page, live at https://kayhardam.dev in Dutch and English.
PE teacher and handball coach; I build tools for sport and education.

The hero plays a shared board from [Coachboard](https://handballcoachboard.com), the digital
tactics board for handball I'm building. The board's code is copied from the Coachboard repo,
unchanged and guarded by tests.

- Astro 7, static: no JavaScript except one Svelte island, the board
- Cloudflare Workers, deployed by Workers Builds on every merge to `main`
- CSP `'self'` only, no analytics, no cookies

`npm run dev`, `npm run verify`, `npm run e2e`. The rules and the structure are in AGENTS.md.

Measurements per phase are in docs/metingen.md (Dutch).

## License

The code is MIT, see LICENSE. The texts, the logo and the photo are © Kay Hardam and not part of it.
