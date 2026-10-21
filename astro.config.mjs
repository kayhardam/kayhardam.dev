// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
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
  // The board (src/components/board/) is Svelte, as in Coachboard: the one island,
  // BoardCard with client:visible (scripts/check-budget.mjs). Astro's inline scripts
  // for it are covered by the hashes in the CSP above.
  // The sitemap with hreflang nl and en, as in Coachboard (commit 88a58a4). It leaves
  // the 404 page out by itself; x-default (/en/) is only in the HTML of each page.
  integrations: [sitemap({ i18n: { defaultLocale: "nl", locales: { nl: "nl", en: "en" } } }), svelte()],
});
