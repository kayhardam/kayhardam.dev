# Metingen

Alle metingen per fase, met datum en commit. Zoals in Coachboard.

## Fase 1: basis (17 oktober 2026)

### Meetomgeving

- Node 22.22.2, npm 10.9.7, Astro 7.4, op een Mac.
- `npm run verify` groen: 2 testbestanden met 12 tests, 3 pagina's, 9 interne links.
- `npm run e2e` groen: 44 tests (22 per browser, Pixel 7 en iPhone 15).

### Groottes (`dist/`)

Gzip met Node `zlib` op standaardniveau, in KB (1000 bytes). Lettertypen raw (woff2 is al gecomprimeerd). Astro zet alle CSS inline in de HTML, dus de HTML telt de CSS mee.

| Pagina | HTML gzip | CSS-bestanden | JS |
|---|--:|--:|--:|
| `/` | 2,2 | 0 | 0 |
| `/en/` | 2,2 | 0 | 0 |
| `/404.html` | 1,8 | 0 | 0 |

| Lettertype | Raw |
|---|--:|
| Barlow Condensed 600, Latijn (woff2) | 22,3 |
| Barlow Condensed 700, Latijn (woff2, preload) | 22,4 |

### Budgetten (`scripts/check-budget.mjs`)

Gemeten plus ongeveer 15%: HTML 2,55 KB per pagina, CSS-bestanden 1,0 KB per pagina, een lettertype 25,8 KB. Geen enkel script.

### Lighthouse

Volgt op de preview-URL, zodra Workers Builds gekoppeld is.
