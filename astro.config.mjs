// @ts-check
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";

// Port 4322, not Astro's 4321: Coachboard's dev server may run at the same time.
export default defineConfig({
  site: "https://kayhardam.dev",
  trailingSlash: "always",
  server: { port: 4322 },
  // All CSS in the page, also above Astro's 4 KB limit: no render-blocking request,
  // and the HTML budget covers it (scripts/check-budget.mjs).
  build: { inlineStylesheets: "always" },
  // Dutch on /, English on /en/.
  i18n: {
    locales: ["nl", "en"],
    defaultLocale: "nl",
    routing: { prefixDefaultLocale: false },
  },
  // A CSP <meta> on every page, with hashes for Astro's inline scripts and styles.
  // frame-ancestors can't go in a <meta>; it is in public/_headers.
  security: {
    csp: {
      directives: ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"],
    },
  },
  markdown: { syntaxHighlight: false },
  // The board (src/components/board/) is Svelte, as in Coachboard. Until phase 5 it
  // only renders at build time: no client: directive, so no JavaScript on the page.
  integrations: [svelte()],
});
