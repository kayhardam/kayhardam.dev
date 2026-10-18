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

### Lighthouse (18 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-1-basis-kayhardam-site.hardamkay.workers.dev/`, commit `479e57e`. Eén run per pagina en methode.

De 404-pagina is gemeten op `/404`: Lighthouse weigert een pagina met status 404 ("unable to reliably load the page"). `/404` geeft dezelfde HTML als een ontbrekende URL (vergeleken met `cmp`), maar met status 200.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 96 / 58 | 100 / 100 / 96 / 58 |
| `/en/` | 100 / 100 / 96 / 58 | 100 / 100 / 96 / 58 |
| 404 (`/404`) | 100 / 100 / 96 / 54 | 100 / 100 / 96 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 0,9 s / 1,2 s / 0 ms / 0,024 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 0,8 s |
| `/en/` | 0,9 s / 1,2 s / 0 ms / 0,018 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 0,8 s |
| 404 (`/404`) | 0,8 s / 1,1 s / 0 ms / 0 / 0,8 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,9 s |

**SEO, verwacht lager op de preview.** Twee audits falen op alle drie de pagina's:

- `is-crawlable` ("Page is blocked from indexing"): de preview stuurt `X-Robots-Tag: noindex` (gecontroleerd met `curl -I` op `/`, `/en/` en een ontbrekende URL). Cloudflare zet die header op preview-URLs; hij staat niet in `public/_headers`. De 404-pagina heeft daarnaast zelf `<meta name="robots" content="noindex">`, en die hoort te blijven. Op het eigen domein (fase 6) valt de header weg voor `/` en `/en/`.
- `meta-description` ("Document does not have a meta description"): er is nog geen meta description. De teksten komen in fase 6.

De 404 scoort 54 in plaats van 58 omdat de `canonical`-audit daar niet meetelt (geen canonical, terecht), zodat de twee fouten zwaarder wegen.

**Best Practices 96:** `errors-in-console`, door een 404 op `/favicon.ico`. Er is nog geen favicon; het logo "KH" komt volgens de brief ook als favicon.

**404 met curl:** Cloudflare geeft de 404-pagina alleen bij een navigatie (`Sec-Fetch-Mode: navigate`, wat een browser stuurt). Zonder die header geeft een ontbrekende URL de tekst "Not found" (9 bytes), ook met status 404. `e2e/notfound.spec.ts` slaagt tegen de preview.

## Fase 2: de pagina (18 oktober 2026)

### Meetomgeving

- Node 22.22.2, npm 10.9.7, Astro 7.4, op een Mac.
- `npm run verify` groen: 4 testbestanden met 23 tests, 3 pagina's, 9 interne links.
- `npm run e2e` groen: 132 tests (66 per browser, Pixel 7 en iPhone 15).

### Groottes (`dist/`)

Gemeten zoals in fase 1. Alle CSS staat nu in de pagina (`build.inlineStylesheets: "always"`): zonder die instelling zet Astro hem boven 4 KB in een los bestand, met een extra request dat het renderen blokkeert.

| Pagina | HTML raw | HTML gzip | CSS-bestanden | JS |
|---|--:|--:|--:|--:|
| `/` | 13,5 | 4,1 | 0 | 0 |
| `/en/` | 13,6 | 4,1 | 0 | 0 |
| `/404.html` | 3,9 | 1,8 | 0 | 0 |

De lettertypen zijn ongewijzigd: 22,3 KB (600) en 22,4 KB (700, preload).

### Budgetten (`scripts/check-budget.mjs`)

HTML van 2,55 naar **4,8 KB** per pagina: 4,15 KB gemeten plus 15%. De reden: alle teksten van de pagina en de CSS van de vier secties en de kaart komen erbij. De andere budgetten blijven gelijk.

### Het eerste scherm

De onderkant van de hero-knop, gemeten in de e2e-browsers (NL en EN gelijk):

| Toestel | Venster | Kaart | Onderkant knop | Over |
|---|---|--:|--:|--:|
| iPhone 15 (WebKit) | 393×659 | 475,8 | 640,8 | 18 |
| Pixel 7 (Chromium) | 412×839 | 491,1 | 656,1 | 183 |
