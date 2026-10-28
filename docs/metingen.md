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

### Lighthouse (18 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-2-pagina-kayhardam-site.hardamkay.workers.dev/`, commit `3e3d849`. De HTML van `/` op de preview is gelijk aan die van de lokale build (gecontroleerd met `cmp`). Eén run per pagina en methode. De 404 is gemeten op `/404`, net als in fase 1.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 96 / 58 | 100 / 100 / 96 / 58 |
| `/en/` | 100 / 100 / 96 / 58 | 100 / 100 / 96 / 58 |
| 404 (`/404`) | 100 / 100 / 96 / 54 | 100 / 100 / 96 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,2 s / 1,3 s / 0 ms / 0,028 / 1,4 s | 0,8 s / 0,8 s / 0 ms / 0,028 / 0,8 s |
| `/en/` | 0,9 s / 1,2 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0,021 / 0,8 s |
| 404 (`/404`) | 0,9 s / 1,1 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

**Dezelfde drie audits falen als in fase 1, met dezelfde oorzaak:** `is-crawlable` (de preview stuurt `X-Robots-Tag: noindex`), `meta-description` (fase 6) en `errors-in-console` (een 404 op `/favicon.ico`, fase 3).

**CLS:** de enige verschuiving is het statement onder het bord (`p.statement`, oorzaak "Web font loaded"). Als Barlow Condensed laadt, breekt het statement anders af. Het bord en de knop staan erboven en verschuiven niet (ook getest in `e2e/board-box.spec.ts`). Met 0,028 blijft dit ruim onder de grens van 0,1.

### Security tegen de preview

`E2E_BASE_URL=https://fase-2-pagina-kayhardam-site.hardamkay.workers.dev npx playwright test e2e/security.spec.ts`: 12 tests groen (Pixel 7 en iPhone 15). Geen CSP-fouten, niets van een ander domein, de security headers kloppen en de lettertypen komen van de site zelf.

## Fase 3: de beeldtaal (18 oktober 2026)

### Meetomgeving

- Node 22.22.2, npm 10.9.7, Astro 7.4, op een Mac.
- `npm run verify` groen: 5 testbestanden met 28 tests, 3 pagina's, 18 interne links (de drie iconen erbij, op elke pagina).
- `npm run e2e` groen: 258 tests, en 2 overgeslagen: de test op layout shifts draait alleen in Chromium (WebKit kent de Layout Instability API niet). `e2e/board-box.spec.ts` is ongewijzigd.

### Groottes (`dist/`)

Gemeten zoals in fase 1 en 2. De SVG's (logo, nummers, pass, veldlijnen, schot) en hun CSS staan in de pagina.

| Pagina | HTML raw | HTML gzip | CSS-bestanden | JS |
|---|--:|--:|--:|--:|
| `/` | 20,0 | 5,45 | 0 | 0 |
| `/en/` | 20,0 | 5,45 | 0 | 0 |
| `/404.html` | 4,1 | 1,9 | 0 | 0 |

| Icoon | Raw (bytes) |
|---|--:|
| `favicon.svg` | 388 |
| `favicon.ico` (16 en 32 px) | 1617 |
| `apple-touch-icon.png` (180 px) | 4866 |

De lettertypen zijn ongewijzigd: 22,3 KB (600) en 22,4 KB (700, preload).

### Budgetten (`scripts/check-budget.mjs`)

- HTML van 4,8 naar **6,3 KB** per pagina: 5,45 KB gzip gemeten, plus 15%. De reden: de SVG's van de beeldtaal en hun CSS staan in de pagina. Een externe sprite zou een extra request kosten.
- Nieuw: **Icon 5,6 KB** per bestand (raw), voor de drie iconen: 4,9 KB voor `apple-touch-icon.png`, de grootste, plus 15%.

### Lighthouse (18 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-3-beeldtaal-kayhardam-site.hardamkay.workers.dev/`, commit `29f3600`. De HTML van `/` op de preview is gelijk aan die van de lokale build (`cmp`). Eén run per pagina en methode. De 404 is gemeten op `/404`, net als in fase 1.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 58 | 100 / 100 / 100 / 58 |
| `/en/` | 100 / 100 / 100 / 58 | 100 / 100 / 100 / 58 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 0,9 s / 1,2 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 0,8 s |
| `/en/` | 1,2 s / 1,3 s / 0 ms / 0 / 1,3 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 0,8 s |
| 404 (`/404`) | 0,9 s / 1,2 s / 0 ms / 0 / 1,0 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

**Best Practices 100:** de favicon is er, dus de 404 op `/favicon.ico` en de consolefout zijn weg.

**SEO blijft 58 / 54**, met dezelfde twee audits als in fase 1 en 2: `is-crawlable` (de preview stuurt `X-Robots-Tag: noindex`) en `meta-description` (fase 6).

**CLS:** de enige verschuiving is nog steeds het statement (`p.statement`, "Web font loaded"), 0,024 en 0,018. De header, de kaart, de knop, de nummers en de pass verschuiven niet; `e2e/art.spec.ts` test dat met vertraagde lettertypen.

### Tegen de preview

`E2E_BASE_URL=https://fase-3-beeldtaal-kayhardam-site.hardamkay.workers.dev npx playwright test e2e/security.spec.ts e2e/icons.spec.ts`: 30 tests groen (Pixel 7 en iPhone 15). Geen CSP-fouten, niets van een ander domein, de security headers kloppen, de drie iconen geven 200 met het goede type (`favicon.ico` als `image/vnd.microsoft.icon`), en geen consolefouten of mislukte verzoeken.

## Fase 4: het speelbord zonder JavaScript (18 oktober 2026)

### Meetomgeving

- Node 22.22.2, npm 10.9.7, Astro 7.4, Svelte 5, op een Mac.
- `npm run verify` groen: `astro check` en `svelte-check` zonder fouten of waarschuwingen, 10 testbestanden met 80 tests, 3 pagina's, 18 interne links.
- `npm run e2e` groen: 314 tests, en 2 overgeslagen (de test op layout shifts, alleen Chromium). `e2e/board-box.spec.ts` is ongewijzigd.

### Groottes (`dist/`)

Gemeten zoals in de vorige fasen. De kaart is bij de build gerenderd: het veld als SVG (13 spelers, de lijnen, een pijl), de legenda, de knoppen en hun CSS staan in de pagina. Er komt geen JavaScript bij.

| Pagina | HTML raw | HTML gzip | CSS-bestanden | JS |
|---|--:|--:|--:|--:|
| `/` | 28,8 | 6,76 | 0 | 0 |
| `/en/` | 28,8 | 6,74 | 0 | 0 |
| `/404.html` | 4,2 | 2,0 | 0 | 0 |

De kaart kost dus 1,3 KB gzip (van 5,45 naar 6,76 KB). De lettertypen en de iconen zijn ongewijzigd.

### Budgetten (`scripts/check-budget.mjs`)

- HTML van 6,3 naar **7,8 KB** per pagina: 6,76 KB gzip gemeten, plus 15%. De reden: de kaart met het veld en de CSS ervan staan in de pagina.
- Scripts blijft **0**. Het JS-budget komt in fase 5, met het island.

### Lighthouse (18 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-4-speelbord-kayhardam-site.hardamkay.workers.dev/`, commit `001b5db`. De HTML van `/` en `/en/` op de preview is gelijk aan die van de lokale build (`cmp`). Eén run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 58 | 100 / 100 / 100 / 58 |
| `/en/` | 100 / 100 / 100 / 58 | 100 / 100 / 100 / 58 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,2 s / 1,2 s / 0 ms / 0,024 / 1,2 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 0,9 s |
| `/en/` | 1,2 s / 1,2 s / 0 ms / 0,018 / 1,2 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 0,9 s |
| 404 (`/404`) | 0,9 s / 1,1 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,9 s |

**SEO blijft 58 / 54**, met dezelfde twee audits als in de vorige fasen: `is-crawlable` (de preview stuurt `X-Robots-Tag: noindex`) en `meta-description` (fase 6).

**CLS:** precies als in fase 3. De enige verschuiving is het statement (`p.statement`, "Web font loaded"): 0,024 en 0,018. De kaart, met zijn nieuwe inhoud, verschuift niet.

### Tegen de preview

`E2E_BASE_URL=https://fase-4-speelbord-kayhardam-site.hardamkay.workers.dev npx playwright test e2e/security.spec.ts e2e/board.spec.ts`: 68 tests groen (Pixel 7 en iPhone 15). Er zijn geen CSP-fouten en niets komt van een ander domein. De security headers kloppen. De kaart toont stap 1 van de link van de knop, ook zonder JavaScript, en de pagina laadt geen script.

CI (`verify` en `e2e`, op Linux) is groen op dezelfde commit. Daar is `system-ui` een ander lettertype, en ook dan passen alle acht zinnen op 320 px in twee regels.

## Fase 5: het speelbord speelt af (19 oktober 2026)

### Meetomgeving

- Node 22.22.2, Astro 7.4, Svelte 5.57, `@astrojs/svelte` 9.1, Vite 8.3 (Rolldown), op een Mac.
- `npm run verify` groen: `astro check` en `svelte-check` zonder fouten of waarschuwingen, 11 testbestanden met 95 tests, 3 pagina's.
- `npm run e2e` groen: 407 tests, en 3 overgeslagen (de tests op layout shifts, alleen Chromium). `e2e/board-box.spec.ts` is ongewijzigd en groen terwijl het bord speelt.

### Groottes (`dist/`)

| Pagina | HTML raw | HTML gzip | CSS-bestanden | JS (gzip) |
|---|--:|--:|--:|--:|
| `/` | 41,7 | 9,62 | 0 | 21,24 |
| `/en/` | 41,6 | 9,58 | 0 | 21,24 |
| `/404.html` | 4,2 | 2,0 | 0 | 0 |

De HTML van `.board` is byte voor byte die van fase 4. De HTML groeit met 2,86 KB gzip. Dat komt van:
- de twee inline scripts van Astro (2,1 KB);
- de props van het island: het bord, de legenda en de teksten, 0,57 KB;
- de `<astro-island>`-tag en de `<style>` met `display: contents`.

**De JS-bestanden** (alle drie uit `/_astro/`; er zijn geen andere):

| Bestand | Wat | Raw | Gzip |
|---|---|--:|--:|
| `BoardCard.Cp5cfyet.js` (`component-url`) | de kaart, met `Court.svelte`, `play.ts`, `moves.ts`, `geometry.ts`, `viewer.ts` en `viewerIcons.ts` | 15,80 KB | 6,34 KB |
| `client.Bx5JppYJ.js` (gedeeld) | de runtime van Svelte | 37,39 KB | 14,40 KB |
| `client.svelte.CiYiP-Fg.js` (`renderer-url`) | de Svelte-renderer van Astro | 0,89 KB | 0,50 KB |
| **Samen** | | 54,07 KB | **21,24 KB** |

Lazy JS: 0. De lettertypen en de iconen zijn ongewijzigd.

### Budgetten (`scripts/check-budget.mjs`)

- **JS per pagina: 24,4 KB** (21,24 KB plus 15%). Het budget telt de bestanden uit `component-url` en `renderer-url` plus alles wat die statisch importeren.
- **Lazy JS: 0.**
- **All JS** (elke `.js` in `/_astro/`): 24,4 KB.
- **HTML van 7,8 naar 11,1 KB** per pagina (9,62 KB plus 15%). De reden: de scripts van Astro en de props van het island.
- **Scripts: 0 fouten.** De regels:
  - hoogstens één island per pagina, en dat is `BoardCard` met `client="visible"`;
  - geen island op de 404-pagina;
  - een inline script alleen met het island, hoogstens twee;
  - geen `<script src>` en geen `modulepreload`.

### Lighthouse (19 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-5-afspelen-kayhardam-site.hardamkay.workers.dev/`, commit `a16abf9`. De HTML op de preview is gelijk aan die van de lokale build, op de `uid` van het island na: die maakt Astro bij elke build opnieuw. Eén run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 58 | 100 / 100 / 100 / 58 |
| `/en/` | 100 / 100 / 100 / 58 | 100 / 100 / 100 / 58 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 0,9 s / 1,1 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 1,1 s / 1,1 s / 0 ms / 0,018 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |
| 404 (`/404`) | 0,9 s / 1,1 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO blijft 58 / 54**, met dezelfde twee audits als in fase 4: `is-crawlable` (de preview stuurt `X-Robots-Tag: noindex`) en `meta-description` (fase 6).
- **CLS:**
  - de enige verschuiving is, net als in fase 4, het statement (`p.statement`, "Web font loaded");
  - de kaart verschuift niet, ook niet terwijl hij speelt;
  - in de simulated run van `/` was het lettertype er op tijd: CLS 0.
- **Speed Index (devtools): van 0,9 naar 1,1 s.** Het bord blijft bewegen, dus het beeld is pas later "af". FCP en LCP blijven gelijk.
- **Main thread (devtools):**
  - van 0,2 naar 1,1 s. Dat is vooral het afspelen tijdens de meting;
  - één lange taak: 75 ms op 678 ms (`/`) en 66 ms op 704 ms (`/en/`);
  - TBT blijft 0 ms.

**De waterval** (devtools, `/`, ms na de start):

| Bestand | Begint | Klaar | Over de lijn |
|---|--:|--:|--:|
| `BoardCard.….js` | 794 | 1472 | 7,6 KB |
| `client.svelte.….js` (renderer) | 794 | 1386 | 1,2 KB |
| `client.….js` (runtime) | 1390 | 2037 | 15,9 KB |

- De kaart en de renderer beginnen tegelijk, na de eerste paint (0,8 s).
- De runtime begint pas als de renderer binnen is: twee lagen, zoals het plan voorspelde.
- Zonder `modulepreload` (hoofdstuk 8 van het plan). Tot de JS er is, staat stap 1 er al, compleet, met de knoppen uit.

### Tegen de preview

`E2E_BASE_URL=https://fase-5-afspelen-kayhardam-site.hardamkay.workers.dev npx playwright test e2e/security.spec.ts e2e/board.spec.ts e2e/play.spec.ts`: 161 tests groen en 1 overgeslagen (layout shifts, alleen Chromium), in Pixel 7 en iPhone 15. Wat dat bevestigt:
- geen CSP-fouten, ook niet met het island en zijn drie scripts, en niets komt van een ander domein;
- de pagina laadt alleen de scripts van het island;
- het bord speelt, stopt en pauzeert zoals lokaal;
- de volgorde van `aria-live` en de zin klopt.

CI (`verify` en `e2e`, op Linux) is groen op dezelfde commit.

## Fase 6: de livegang (21 oktober 2026)

### Meetomgeving

- Node 22.22.2, Astro 7.4, `@astrojs/sitemap` 3.7.4, sharp 0.35, Playwright (Chromium en WebKit), Wrangler 4.151.1, op een Mac.
- `npm run verify` groen bij elke commit: `astro check` en `svelte-check` zonder fouten of waarschuwingen, 12 testbestanden met 103 tests, 3 pagina's.
- `npm run e2e` groen: 419 tests, en 3 overgeslagen (de tests op layout shifts, alleen Chromium).
- `npx wrangler deploy --dry-run` slaagt met `routes` (`kayhardam.dev` als Custom Domain).

### Groottes (`dist/`)

| Pagina | HTML raw | HTML gzip | CSS-bestanden | JS (gzip) |
|---|--:|--:|--:|--:|
| `/` | 42,2 | 9,80 | 0 | 21,24 |
| `/en/` | 42,2 | 9,75 | 0 | 21,24 |
| `/404.html` | 4,2 | 2,0 | 0 | 0 |

- De HTML groeit met 0,18 KB gzip (`/`): de description en de Open Graph-tags. Het fotovak dat weg is, scheelt een paar regels CSS. Dat is wat het prototype mat.
- **De deelafbeeldingen** (raw, 1200 × 630, RGB zonder alfakanaal, geen palet): `og-nl.png` 48,75 KB, `og-en.png` 48,58 KB. Het logo en de kaart staan in het midden van de hoogte: 65 px boven (de eerste lichte pixel van het logo) en 65 px onder (de onderkant van de kaart, zonder de schaduw).
- `robots.txt` 73 B, `sitemap-index.xml` 184 B, `sitemap-0.xml` 723 B.
- JS, lettertypen en iconen zijn ongewijzigd.

### Budgetten (`scripts/check-budget.mjs`)

- **Nieuw: Share image, 56,1 KB** (48,75 KB plus 15%), raw, voor elke `og-*.png` in de root.
- **HTML blijft 11,1 KB.** De rest is ongewijzigd.

### Over mij zonder fotovak

De hoogte van de sectie (px, NL, met reduced motion), gelijk aan "Na2" in het plan:

| iPhone 15 | Pixel 7 | 360 | 768 | 1280 |
|--:|--:|--:|--:|--:|
| 615 (EN 614) | 584 | 615 | 459 | 694 |

Met het fotovak (fase 5) was dat 1080, 1049, 1065, 924 en 694.

### Lighthouse (21 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-6-livegang-kayhardam-site.hardamkay.workers.dev/`, commit `6a19ea5`. De HTML op de preview is gelijk aan die van de lokale build, op de `uid` van het island na. Eén run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| `/en/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,1 s / 1,1 s / 0 ms / 0 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 0,9 s / 1,1 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |
| 404 (`/404`) | 0,8 s / 1,1 s / 0 ms / 0 / 0,8 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO van 58 naar 66** op `/` en `/en/`: `meta-description` slaagt nu. Alleen `is-crawlable` faalt nog, omdat de preview `X-Robots-Tag: noindex` stuurt. Het plan verwachtte hier 58; dat was te laag, want het rekende `meta-description` nog als fout. De echte meting (verwacht 100) is op productie.
- **De 404 blijft 54:** `noindex` en geen description, zo bedoeld (afwijking 3).
- Performance, Accessibility en Best Practices blijven 100; de metrics zijn die van fase 5.

### Tegen de preview

`E2E_BASE_URL=https://fase-6-livegang-kayhardam-site.hardamkay.workers.dev npx playwright test e2e/security.spec.ts e2e/seo.spec.ts e2e/board.spec.ts e2e/play.spec.ts`: 177 tests groen en 1 overgeslagen (layout shifts, alleen Chromium), in Pixel 7 en iPhone 15. Wat dat bevestigt:
- geen CSP-fouten, niets van een ander domein;
- de meta-tags per taal, `og:image` als PNG van 1200 × 630, de 404 zonder description en Open Graph;
- `robots.txt` en de sitemap.

Content-Type op de preview: `robots.txt` `text/plain` (zonder `charset`; `wrangler dev` stuurt `text/plain; charset=utf-8`, en de tekst is ASCII), de sitemaps `application/xml`, de PNG's `image/png`, alle met de security headers.

## Fase 6: na de livegang (21 oktober 2026)

Gemeten op `https://kayhardam.dev`, na de merge van PR #7 (commit `bac26e0` op `main`). `dist/` is `npm run build` op die commit. Node 22.22.2, Lighthouse 13.5.0, headless Chrome 154, op een Mac.

### Met `curl`

| Controle | Verwacht | Gemeten |
|---|---|---|
| `curl -sI https://kayhardam.dev/` en `/en/` | 200; HSTS en de zes andere headers; geen `x-robots-tag` | **Klopt.** 200, `strict-transport-security: max-age=31536000` en de zes andere headers uit `_headers`, geen `x-robots-tag` |
| `curl -sI http://kayhardam.dev/en/` | 301 → `https://kayhardam.dev/en/` | **Klopt, na een correctie (zie hieronder).** Eerst 200; nu 301 → `https://kayhardam.dev/en/` |
| `curl -sI 'https://www.kayhardam.dev/en/?x=1'` | 301 → `https://kayhardam.dev/en/?x=1` | **Klopt** |
| `curl -sI http://www.kayhardam.dev/en/` | 301 → `https://www.…`, dan 301 → het kale domein | **Wijkt af, maar goed:** één 301, meteen naar `https://kayhardam.dev/en/`, ook nu Always Use HTTPS aan staat. De Redirect Rule vangt HTTP zelf al |
| `curl -sI https://kayhardam.dev/en` | 307 → `/en/` | **Klopt** |
| De 404 met `Sec-Fetch-Mode: navigate` (`/bestaat-niet/`) | 404, met de 404-pagina | **Klopt.** 404, de HTML gelijk aan `dist/404.html` (`cmp`) |
| De 404 zonder die header | "Not found" (fase 1) | **Wijkt af, maar goed:** ook 404 mét de 404-pagina (4241 B, `<title>Pagina niet gevonden \| Kay Hardam</title>`, `noindex`) |
| `/robots.txt` | `Allow: /` en de Sitemap-regel | **Klopt.** 200, `text/plain`, 73 B, met de security headers |
| `/sitemap-index.xml` → `/sitemap-0.xml` | precies `/` en `/en/`, met hreflang | **Klopt.** Beide 200, `application/xml`; `/` en `/en/`, elk met hreflang `nl` en `en` |
| `og:image` van `/` en `/en/` | absoluut op `https://kayhardam.dev`; 200, `image/png` | **Klopt.** `https://kayhardam.dev/og-nl.png` (48.750 B) en `og-en.png` (48.578 B): 200, `image/png`, byte voor byte gelijk aan `dist/` |
| canonical en `og:url` | absoluut, met `/` aan het eind | **Klopt.** `https://kayhardam.dev/` en `https://kayhardam.dev/en/`; hreflang `nl`, `en` en `x-default` (→ `/en/`) ook |

- `/404` geeft 200 en dezelfde HTML als `dist/404.html` (`cmp`); daarop meet Lighthouse.
- Cloudflare stuurt op elke response ook `report-to` en `nel` (Network Error Logging, `success_fraction` 0). Dat zijn headers, niets in de HTML.

### Van HTTP naar HTTPS

Bij de eerste meting gaf HTTP op het kale domein 200, de pagina zelf: Always Use HTTPS werkte niet. Kay heeft hem in de zone `kayhardam.dev` opnieuw aangezet. Gemeten om 17:37, een minuut later:

| URL | Gemeten |
|---|---|
| `http://kayhardam.dev/` | 301 → `https://kayhardam.dev/` |
| `http://kayhardam.dev/en/` | 301 → `https://kayhardam.dev/en/` |
| `http://kayhardam.dev/en/?x=1` | 301 → `https://kayhardam.dev/en/?x=1` |
| `http://kayhardam.dev/robots.txt` | 301 → `https://kayhardam.dev/robots.txt` |
| `http://www.kayhardam.dev/en/` | 301 → `https://kayhardam.dev/en/`, dan 200 |

- **Het kale domein:** Always Use HTTPS stuurt elke HTTP-URL met 301 naar dezelfde URL op `https://`, met het pad en de query.
- **www:** de Redirect Rule stuurt in één stap naar `https://kayhardam.dev`, met het pad. Een tweede stap via `https://www.…` is er niet.
- Ter controle gaf `http://handballcoachboard.com/en/` op hetzelfde moment 301 → `https://handballcoachboard.com/en/`.

### De placeholder-Worker

Worker `kayhardam-dev` is weg: Kay heeft hem verwijderd na de controles op productie.

### De HTML op productie is gelijk aan `dist/`

Met het commando uit het plan (de `uid` van het island weggelaten): `/ gelijk`, `/en/ gelijk`. Geen `cdn-cgi`, geen beacon, geen `email-protection`; `mailto:hallo@kayhardam.dev` staat er onveranderd op beide pagina's.

### E2E tegen productie

`E2E_BASE_URL=https://kayhardam.dev npx playwright test e2e/security.spec.ts e2e/seo.spec.ts e2e/board.spec.ts e2e/play.spec.ts`: 177 tests groen en 1 overgeslagen (layout shifts, alleen Chromium), in Pixel 7 en iPhone 15. Gelijk aan de preview.

### Lighthouse (21 oktober 2026)

Mobiel (standaard), één run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/en/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,1 s / 1,1 s / 0 ms / 0 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 0,9 s / 0,9 s / 0 ms / 0,018 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |
| 404 (`/404`) | 0,8 s / 1,1 s / 0 ms / 0 / 0,8 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO 100 op `/` en `/en/`,** zoals verwacht: geen `X-Robots-Tag` meer, en een description.
- **De 404 blijft 54:** `is-crawlable` (`noindex`) en `meta-description` falen, zo bedoeld (afwijking 3).
- Simulated `/en/` heeft deze keer CLS 0,018 (op de preview 0), gelijk aan devtools. Eén run; ruim onder 0,1.

## Fase 6: details (21 oktober 2026)

Het schot op doel bij Contact (`src/components/art/Shot.astro`): de lijn vanaf het midden van de KH-speler, een eigen groene driehoek als punt en de bal in het doel (variant B).

### Lighthouse (21 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-6-details-kayhardam-site.hardamkay.workers.dev/`, commit `0711158`. Eén run per pagina en methode; de eerste simulated run van `/` gaf `NO_NAVSTART` (geen trace) en is overgedaan. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| `/en/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,2 s / 1,2 s / 0 ms / 0,024 / 1,2 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 0,9 s / 1,1 s / 0 ms / 0,018 / 1,2 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |
| 404 (`/404`) | 0,8 s / 1,1 s / 0 ms / 0 / 0,8 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO 66 op `/` en `/en/`:** alleen `is-crawlable` faalt, omdat de preview `X-Robots-Tag: noindex` stuurt (zoals op de preview van fase 6; productie gaf 100).
- **De 404 blijft 54:** `is-crawlable` en `meta-description` falen, zo bedoeld (afwijking 3).
- Performance, Accessibility en Best Practices blijven 100; de metrics zijn die van fase 6.

### De deelafbeelding (`public/og.png`)

Eén afbeelding voor `/` en `/en/` in plaats van `og-nl.png` en `og-en.png`: het KH-logo (210 px) en 34 px daaronder KAYHARDAM.DEV (64 px), gestapeld in het midden. 1200 × 630, RGB zonder alfakanaal en zonder palet. De pagina laadt hem niet (alleen `og:image` verandert), dus Lighthouse is niet opnieuw gedraaid.

| | |
|---|---|
| Grootte | 16 735 bytes (16,7 KB); was 48,75 KB (`og-nl.png`) en 48,58 KB (`og-en.png`) |
| Pixels die niet navy zijn | x 388–811, y 170–460 |
| Marges | links 388, rechts 388, boven 170, onder 169 px |
| Logo / tussenruimte / tekst | y 170–379 (210 px), 380–413 (34 px), 414–460 (47 px, de hoofdletters) |
| Budget (`scripts/check-budget.mjs`) | 19,3 KB: gemeten plus 15%, was 56,1 KB |

Alles valt binnen het vierkant x 285–915: links 103 px en rechts 104 px ruimte.

## Fase 6: teksten (21 oktober 2026)

Nieuwe teksten voor Coachboard (de tweede alinea) en Over mij, in `src/i18n/nl.ts` en `src/i18n/en.ts`. De veldlijnen in Over mij en de passes staan op dezelfde plek ten opzichte van hun sectie; alleen de hoogte van de secties verandert met de tekst.

### Lighthouse (21 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-6-teksten-kayhardam-site.hardamkay.workers.dev/`, commit `eefd2a2`. Eén run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| `/en/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,2 s / 1,2 s / 0 ms / 0,024 / 1,2 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 0,9 s / 1,1 s / 0 ms / 0 / 1,3 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |
| 404 (`/404`) | 0,9 s / 1,2 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO 66 op `/` en `/en/`:** alleen `is-crawlable` faalt, omdat de preview `X-Robots-Tag: noindex` stuurt (zoals bij fase 6: details).
- **De 404 blijft 54:** `is-crawlable` en `meta-description` falen, zo bedoeld (afwijking 3).
- Performance, Accessibility en Best Practices blijven 100; de metrics zijn die van fase 6: details.

### Zonder schot, en `text-wrap: pretty` (22 oktober 2026)

Twee commits: het schot op doel bij Contact is weg (`src/components/art/Shot.astro`, Kay), en `p { text-wrap: pretty; }` in `src/styles/base.css`, zodat er geen los woord op de laatste regel van een alinea staat. Het aantal regels verandert nergens op 320, 393 en 1280 px (NL en EN, Chromium en WebKit); alleen het laatste woord krijgt een of meer woorden mee.

| Pagina | HTML raw | HTML gzip | CSS-bestanden | JS (gzip) |
|---|--:|--:|--:|--:|
| `/` | 40,75 | 9,63 | 0 | 21,24 |
| `/en/` | 40,73 | 9,57 | 0 | 21,24 |

- De HTML wordt 0,25 KB gzip kleiner (`/`: van 9,88 bij commit `1fef84c`): de SVG van het schot en zijn CSS. `text-wrap: pretty` voegt een paar bytes toe.
- De budgetten blijven: HTML 11,1 KB.

### Lighthouse, zonder schot (22 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-6-teksten-kayhardam-site.hardamkay.workers.dev/`, commit `9fd8115` (de site is die van `0ba2fc2`). Eén run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| `/en/` | 100 / 100 / 100 / 66 | 100 / 100 / 100 / 66 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 0,8 s / 1,1 s / 0 ms / 0 / 0,8 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 1,1 s / 1,1 s / 0 ms / 0 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |
| 404 (`/404`) | 0,8 s / 1,1 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO 66 op `/` en `/en/`:** alleen `is-crawlable` faalt (de preview stuurt `X-Robots-Tag: noindex`). **De 404 blijft 54:** `is-crawlable` en `meta-description`, zo bedoeld.
- Performance, Accessibility en Best Practices blijven 100. De CLS met devtools is dezelfde als bij `eefd2a2` (0,024 en 0,018).

## Fase 7: de foto (22 oktober 2026)

De foto in Over mij, rond met een witte rand van 5 px, via `<Picture>` uit `astro:assets`. Het grid en veldlijnen B zijn terug.

### Het origineel en de schone kopie

- **Het origineel** (`screenshots/foto/`, buiten git): 799 × 799, JPEG. EXIF (140 bytes) met de maat, `Orientation` 1, `DateTime` 2025:09:28 09:54:14 en `DateTimeOriginal` 2025:09:28 09:52:10; geen GPS, geen camera, geen software. Een ICC-profiel sRGB ("Google Inc. 2016", 472 bytes). Geen XMP, IPTC of commentaar.
- **De kopie** (`src/assets/kay-hardam.jpg`, van `scripts/clean-photo.mjs`): 799 × 799, 134 048 bytes, alleen JFIF en de beelddata. Geen EXIF, ICC, XMP, IPTC of commentaar. Niet opnieuw gecomprimeerd: de pixels zijn gelijk aan het origineel (maximaal verschil 0).

### De bestanden

Astro maakt 9 bestanden (900 wordt 799: niet groter dan het origineel), zonder EXIF of ICC (`e2e/photo.spec.ts`). Raw, in bytes:

| Breedte | AVIF (Mac) | AVIF (CI, Linux) | WebP | JPEG |
|--:|--:|--:|--:|--:|
| 300 | 6 496 | 6,3 KB | 10 454 | 15 209 |
| 600 | 17 499 | 17,3 KB | 31 342 | 47 099 |
| 799 | 29 608 | 29,1 KB | 59 092 | 92 690 |

- **De AVIF verschilt per platform:** de build in CI (`ubuntu-24.04`) maakt iets kleinere AVIF-bestanden, met dezelfde naam (de hash komt van de bron en de opties). WebP en JPEG zijn gelijk.
- **Budget "Photo"**, het grootste bestand plus 15%: AVIF 34,1 KB, WebP 68,0 KB, JPEG 106,6 KB.

### Wat een bezoeker laadt

Eén bestand, AVIF in Chromium en WebKit, met `sizes="min(300px, 70vw)"` (`e2e/photo.spec.ts`):

| Scherm | Foto (css px) | Bestand | Grootte |
|---|--:|---|--:|
| 1280 px, DPR 1 | 300 | 300w | 6,5 KB |
| 1280 px, DPR 2 | 300 | 600w | 17,5 KB |
| iPhone 15 (393 px, DPR 3) | 275 | 799w | 29,6 KB |
| Pixel 7 (412 px, DPR 2,625) | 288 | 799w | 29,6 KB |

`naturalWidth` is de breedte op het scherm (275, 288, 300): beide browsers rekenen `min()` in `sizes` echt uit.

### De HTML

| Pagina | HTML raw | HTML gzip | Was (fase 6) |
|---|--:|--:|--:|
| `/` | 41,91 | 9,93 | 9,62 |
| `/en/` | 41,89 | 9,88 | 9,56 |

+0,32 KB gzip: de `<picture>` met drie `srcset`s en de CSS van het grid en de foto. Het HTML-budget blijft 11,1 KB. Geen JavaScript erbij (Scripts 0, één island) en geen inline style.

### Layout shift

- **De foto komt laat** (vastgehouden tot na de meting, minstens 1,5 s; 1280 px): de maat van de foto (300 × 300) en de plek van nummer 2 zijn vóór en na het laden gelijk, in Chromium en WebKit. Chromium meldt geen verschuiving in `.about`.
- **De foto laadt niet** (`route.abort()`): het vak blijft 300 × 300. Zonder `aspect-ratio: 1` faalt die test in WebKit (nagegaan).

### Over mij per breedte

Gelijk aan het plan, op elke breedte en in beide talen (`screenshots/fase-7/metingen.json`, lokaal): de sectie is op 1280 px even hoog als op `main` (646 px NL, 676 px EN), de grote zinnen blijven vanaf 860 px op 2 + 2 regels, en het midden van de foto en van de tekst verschillen 0 px op 860, 1024 en 1280 px.

### Workers Builds en de preview

- **CI** (`npm ci && npm run verify` op `ubuntu-24.04`) bouwt de foto met sharp op Linux x64: "generating optimized images", 9 bestanden.
- **Workers Builds kwam pas laat:** na de eerste push (commit `d7b82fc`, 22 oktober, 16:44 UTC) kwam er ruim 30 minuten geen build, en de preview gaf 404 (`x-preview-user-error: true`). Oorzaak: een storing bij GitHub (Pull Requests en Actions verminderd, incident van 17:16 UTC). De webhooks kwamen niet aan; ook de PR zag de tweede push eerst niet. Daarna bouwde Workers Builds `67e9cb7`: check "Workers Builds: kayhardam-site" geslaagd. sharp werkt dus bij Workers Builds; er hoefde niets veranderd te worden.
- **Op de preview** (`https://fase-7-foto-kayhardam-site.hardamkay.workers.dev/`, commit `67e9cb7`):
  - de HTML van `/` en `/en/` is gelijk aan `dist/` (op de `uid` van het island na);
  - de 9 bestanden geven 200 met `image/avif`, `image/webp` of `image/jpeg`, en `Cache-Control: public, max-age=31536000, immutable`. De AVIF van 799 px is 29 145 bytes, die van 300 px 6 336: de grootte van de Linux-build, zoals in CI;
  - `E2E_BASE_URL=<preview> npx playwright test e2e/photo.spec.ts e2e/security.spec.ts`: 52 tests groen, in Pixel 7 en iPhone 15.

### Lighthouse (22 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome 154 op een Mac. Gemeten op de preview-URL `https://fase-7-foto-kayhardam-site.hardamkay.workers.dev/`, commit `67e9cb7`. Eén run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 69 | 100 / 100 / 100 / 69 |
| `/en/` | 100 / 100 / 100 / 69 | 100 / 100 / 100 / 69 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,1 s / 1,1 s / 0 ms / 0,024 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 1,2 s / 1,2 s / 0 ms / 0,018 / 1,2 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |
| 404 (`/404`) | 0,8 s / 1,1 s / 0 ms / 0 / 0,8 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO 69 op `/` en `/en/`** (was 66): alleen `is-crawlable` faalt (de preview stuurt `X-Robots-Tag: noindex`). Met de foto telt `image-alt` mee, en die slaagt: (13,04 − 4,04) / 13,04 = 69%. **De 404 blijft 54:** daar is geen foto.
- **De CLS** is die van het lettertype in de hero (0,024 en 0,018, zoals bij `eefd2a2`), niet van de foto. Simulated gaf deze keer dezelfde waarden als devtools.
- **Lighthouse laadt de 600w AVIF** (18,0 KB over het netwerk): een telefoon van 412 px met DPR 1,75, dus een foto van 288 px en 504 px nodig. "Improve image delivery" is daarom 0,5 bij devtools (1 bij simulated), zonder invloed op de score. Geen tussenmaat van 450 px (K5).
- Na de merge volgt de meting op productie (SEO 100 verwacht), in een eigen kleine PR.

## Fase 7: op productie (22 oktober 2026)

Gemeten op `https://kayhardam.dev`, na de merge van PR #11 (commit `8a8000f` op `main`, 18:15 UTC). Workers Builds was om 18:27 UTC klaar; tot dan gaf productie nog de pagina zonder foto, en de bestanden 404. `dist/` is `npm run build` op `8a8000f`. Node 22.22.2, Lighthouse 13.5.0, headless Chrome 154, op een Mac.

### De bestanden met `curl`

Alle 9 bestanden geven 200 met het juiste Content-Type en `Cache-Control: public, max-age=31536000, immutable`. De drie van 799 px:

| Bestand | Content-Type | Bytes op productie | Bytes in `dist/` (Mac) |
|---|---|--:|--:|
| `kay-hardam.Wcf1GJew_Z2ozGy1.avif` | `image/avif` | 29 145 | 29 608 |
| `kay-hardam.Wcf1GJew_Z15bGW7.webp` | `image/webp` | 59 092 | 59 092 |
| `kay-hardam.Wcf1GJew_19YYq5.jpg` | `image/jpeg` | 92 690 | 92 690 |

- **De AVIF komt van de Linux-build,** zoals op de preview: 29 145 bytes (799 px), 17 280 (600) en 6 336 (300). WebP en JPEG zijn byte voor byte even groot als op de Mac.

### De HTML op productie is gelijk aan `dist/`

Met het commando van fase 6 (de `uid` van het island weggelaten): `/ gelijk`, `/en/ gelijk`. Geen `cdn-cgi`, geen beacon, geen `email-protection`; `mailto:hallo@kayhardam.dev` staat er onveranderd op beide pagina's. Geen `X-Robots-Tag`.

### E2E tegen productie

`E2E_BASE_URL=https://kayhardam.dev npx playwright test e2e/photo.spec.ts e2e/security.spec.ts`: 52 tests groen, in Pixel 7 en iPhone 15. Gelijk aan de preview.

### Lighthouse (22 oktober 2026)

Mobiel (standaard), één run per pagina en methode.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/en/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,2 s / 1,2 s / 0 ms / 0 / 1,2 s | 0,8 s / 0,8 s / 0 ms / 0,024 / 1,1 s |
| `/en/` | 1,1 s / 1,1 s / 0 ms / 0 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0,018 / 1,1 s |

- **SEO 100 op `/` en `/en/`,** zoals verwacht: `is-crawlable` slaagt (geen `X-Robots-Tag`), en `image-alt` slaagt.
- **De CLS** bij devtools is die van het lettertype in de hero (0,024 en 0,018), gelijk aan de preview. Simulated gaf deze keer 0.
- **Lighthouse laadt de 600w AVIF** (17,9 KB over het netwerk), zoals op de preview. "Improve image delivery" is 0,5 bij devtools en 1 bij simulated, zonder invloed op de score.

## Fase 8: neutraal en persoonlijk (25 oktober 2026)

Kleur komt alleen van de foto en van de kaart van het bord; de rest is navy, wit en grijs. De favicon navy met een witte rand, de touch-icon en `og.png` met de witte speler uit de header. Kays foto ook in de hero, 64 px, vóór de naam. Over mij met de nieuwe teksten, en harde spaties in de club. Gemeten op de Mac met Node 22.22.2, Astro 7.4.0, Playwright 1.64 (Chromium en WebKit) en Lighthouse 13.5.0. De metingen per breedte, de pixels van de focusring en van de favicon komen uit het plan (`docs/plan-fase-8.md`, een prototype van dezelfde code); de rest is gemeten op de branch `fase-8-neutraal`.

### Contrast van de nieuwe kleurparen

Uitgerekend uit de hex-waarden (WCAG 2.x). Tekst moet 4,5:1 halen, vlakken, randen en de focusring 3:1.

| Paar | Contrast |
|---|--:|
| Header: de witte speler, het label KH en de actieve taal (navy op `#F8FAFC`) | 17,06 |
| Hero: de naam `#F8FAFC` op navy (was `#4ADE80`: 10,25) | 17,06 |
| Hero: de knop, navy op `#F8FAFC` (was wit op groen: 5,02) | 17,06 |
| Hero: de witte rand van de foto op navy | 17,85 |
| Nummer 1: wit cijfer op navy, de navy speler op wit | 17,85 |
| Nummer 2 en 3: navy cijfer op wit | 17,85 |
| Nummer 2: witte speler op `#1E293B` | 14,63 |
| "Naar Coachboard": navy op wit, en bij hover wit op navy | 17,85 |
| Over mij: tekst `#F8FAFC` op `#1E293B` (was wit op groen: 5,02) | 13,98 |
| Over mij: kop `#94A3B8` op `#1E293B`, de laagste van alle tekst | 5,71 |
| Contact: kop `#94A3B8` op navy | 6,96 |
| 404: link `#F8FAFC` op navy | 17,06 |
| Decoratief: de pass `#64748B` op navy en op wit; de streep onder het mailadres; de 9 m in de hero (`#94A3B8` op 30%) | 3,75 / 4,76; 3,75; 1,74 |

axe (`e2e/a11y.spec.ts`, WCAG 2.1 A en AA) is groen op `/`, `/en/` en de 404, in Chromium en WebKit.

### De focusring

`#64748B` (`--color-text-small`), 3 px, offset 2 px. Op de pixels (Chromium, DPR 2, Tab door de pagina op 1280 en 393 px en op de 404):

| Achtergrond | Waar | Contrast |
|---|---|--:|
| Navy `#0F172A` | header, Contact, 404 | 3,75 |
| Navy onder de schaduw van de kaart (`#0B1224`) | naast de hero-knop | 3,92 |
| Wit | de kaart, "Naar Coachboard" | 4,76 |
| `#1E293B` | Over mij (daar is geen link) | 3,07 |
| Vorige op stap 1 (`aria-disabled`, 40% dekking; met groen was het 1,59) | de kaart | 1,70 |

`e2e/a11y.spec.ts` tabt door `/`, `/en/` en de 404 (WebKit met Alt+Tab) en vindt op elke link en knop `3px solid rgb(100, 116, 139)`, offset 2px.

### De favicon op licht en donker

Het contrast van de rand met het tabblad, op de pixel met het meeste contrast in de buitenste 15%:

| | Wit | `#DFE1E5` | `#1F1F1F` | `#3C3C3C` |
|---|--:|--:|--:|--:|
| Nieuw, 16 px (ico / svg) | 17,85 / 17,85 (navy) | 13,64 / 13,64 (navy) | 11,89 / 11,69 (wit) | 8,13 / 7,98 (wit) |
| Nieuw, 32 px | 17,85 | 13,64 | 15,52 | 10,48 |
| Was (groen), 16 px | 5,02 | 3,83 | 12,69 | 8,65 |

Op donker is de navy cirkel zelf bijna gelijk aan het tabblad (1,08 tot 1,62); de witte rand maakt hem zichtbaar. `scripts/favicons.test.mjs` kijkt in beide PNG's van `favicon.ico`: licht in het midden van de bovenrand, navy een kwart lager.

### De iconen en `og.png`

| Bestand | Was | Nu |
|---|--:|--:|
| `apple-touch-icon.png` (180 × 180, RGB, `#F8FAFC` op (90, 45)) | 4 866 B | 4 066 B |
| `favicon.ico` (16 en 32 px) | | 1 615 B |
| `favicon.svg` | | 468 B |
| `og.png` (1200 × 630, RGB, `#F8FAFC` op (600, 190); inkt x 388–811, y 170–460) | 16 735 B | 15 031 B |

Na de merge: het WhatsApp-voorbeeld met `https://kayhardam.dev/?wa=2` (Kay).

### Het eerste scherm

In px vanaf de bovenkant van het venster, NL en EN gelijk:

| Venster | Onderkant knop | Foto | Naam | Statement | Foto en naam erin? |
|---|--:|---|---|---|---|
| Pixel 7, Chromium, 412×839 (project `android`) | 656,1 | 688,1–752,1 | 708,1–732,1 | 768,1–853,6 (EN 882,1) | ja: de foto eindigt 86,9 px boven de rand |
| iPhone 15, WebKit, 393×659 (project `iphone`) | 640,8 | 672,8–736,8 | 692,8–716,8 | 752,8–866,8 | nee, akkoord (Kay): de foto begint 13,8 px onder de rand |
| 1280×800, Chromium en WebKit | 772,3 | 288,8–352,8 | 308,8–332,8 | 368,8–592,5 | ja, ook het bord en de knop (27,7 px over) |

Op schermmaten (uit het plan, informatie, geen test): op 360×780, 393×852, 412×915 en 430×932 staan de foto en de naam erin, met 70 tot 165 px over. `e2e/board-box.spec.ts` toetst in het venster van de Pixel 7, en slaat zich in `iphone` over.

### De foto in de hero

AVIF, WebP en JPEG op 64, 128 en 192 px, `sizes="64px"`, `loading="eager"`. De bestanden op de preview: 200, het juiste Content-Type en `public, max-age=31536000, immutable`.

| Breedte | AVIF | WebP | JPEG |
|--:|--:|--:|--:|
| 64 | 874 B | 1 276 B | 1 548 B |
| 128 | 1 964 B | 3 086 B | 4 090 B |
| 192 | 3 499 B (Linux-build: 3 401) | 5 406 B | 7 544 B |

- **Welk bestand:** Chromium en WebKit kiezen hetzelfde, altijd AVIF: 64w bij DPR 1, 128w bij 1,75 en 2, 192w bij 2,625 en 3. `naturalWidth` overal 64. `e2e/photo.spec.ts` toetst de projecten (192w) en 1280 px bij DPR 1 en 2 (64w en 128w).
- **Wat een bezoeker erbij laadt:** 0,9 KB (DPR 1), 2,0 KB (2x) of 3,5 KB (3x), direct bij het laden.
- **Geen layout shift:** de foto, de naam en het statement blijven staan als de foto 1,5 s te laat komt of niet laadt, op 393 en 1280 px, in Chromium en WebKit; het vak blijft 64 × 64.
- **Gemeten:** 64 × 64, rand 3 px wit, 16 px tot de naam, de middens gelijk.

### Over mij: de harde spaties

Op elke breedte van 320 tot 1440 px (1 121 breedtes), NL en EN, Chromium en WebKit: evenveel regels en dezelfde hoogte als zonder harde spaties, en de club breekt nergens meer af (zonder: op 324 tot 558 van de 1 121 breedtes). Niets steekt uit. `src/i18n/texts.test.ts` en `e2e/page.spec.ts` falen als ze weg zijn.

### De HTML

| Pagina (gzip) | `main` | Fase 8 |
|---|--:|--:|
| `/` | 9 940 B | 10 075 B |
| `/en/` | 9 886 B | 10 018 B |
| `/404.html` | 2 013 B | 1 980 B |

De tweede `<picture>` en de harde spaties maken de pagina's ruim 0,13 KB groter. Het budget blijft 11,1 KB. `check-budget.mjs`: 36 controles groen, waarvan 18 rijen "Photo"; JS 21,2 KB, ongewijzigd.

### Tests

- `npm run verify` groen bij elke commit.
- `npm run e2e`: 485 groen, 5 overgeslagen (de 3 van fase 7: geen Layout Instability API in WebKit, en het eerste scherm op `/` en `/en/` in `iphone`).
- In CI was eerst één test rood: de rand van 3 px van de foto in de hero is in WebKit op Linux in het midden `246, 246, 247`, net buiten de marge van 8. De test eist nu minstens 240 per kanaal (commit `5357ee0`); daarna CI groen.

### De preview

`https://fase-8-neutraal-kayhardam-site.hardamkay.workers.dev/`, commit `5357ee0`:
- de HTML van `/` en `/en/` is gelijk aan `dist/`, op de `uid` van het island na; `/404` is gelijk aan `dist/404.html` (`cmp`). De preview stuurt `X-Robots-Tag: noindex`;
- `E2E_BASE_URL=<preview> npx playwright test e2e/photo.spec.ts e2e/security.spec.ts`: 70 tests groen, in Pixel 7 en iPhone 15.

### Lighthouse (25 oktober 2026)

Lighthouse 13.5.0, mobiel (standaard), headless Chrome op een Mac. Gemeten op de preview, commit `5357ee0`. Eén run per pagina en methode. De 404 is gemeten op `/404`.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 69 | 100 / 100 / 100 / 69 |
| `/en/` | 100 / 100 / 100 / 69 | 100 / 100 / 100 / 69 |
| 404 (`/404`) | 100 / 100 / 100 / 54 | 100 / 100 / 100 / 54 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,0 s / 1,2 s / 0 ms / 0 / 1,0 s | 0,8 s / 0,8 s / 0 ms / 0 / 1,1 s |
| `/en/` | 1,1 s / 1,1 s / 0 ms / 0 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0 / 1,1 s |
| 404 (`/404`) | 0,8 s / 1,1 s / 0 ms / 0 / 0,8 s | 0,8 s / 0,8 s / 0 ms / 0 / 0,8 s |

- **SEO 69 en 54,** zoals in fase 7: alleen `is-crawlable` faalt (de `noindex` van de preview), op de 404 ook `meta-description` (bewust: de 404 heeft geen description). `image-alt` slaagt, ook met de lege alt van de foto in de hero.
- **De LCP blijft het statement** (`.statement > span.lead`), niet de foto.
- **De foto in de hero** laadt als 128w AVIF (Lighthouse is DPR 1,75), 2,3 KB over het netwerk, prioriteit High. De foto in Over mij als 600w AVIF (18,0 KB), prioriteit Low.
- **CLS 0** op beide pagina's en methoden (in fase 7 bij devtools 0,024 en 0,018, van het lettertype). "Improve image delivery" is deze keer 1 bij beide methoden.
- Na de merge volgt de meting op productie (SEO 100 verwacht): Lighthouse twee keer op `/` en `/en/`, `curl -sI` op de kleine AVIF, en het WhatsApp-voorbeeld (`?wa=2`).

## Fase 8: op productie (25 oktober 2026)

Gemeten op `https://kayhardam.dev`, na de merge van PR #14 (commit `5d596f2` op `main`, 08:23 UTC), om 15:21 UTC. `dist/` is `npm run build` op `5d596f2`. Node 22.22.2, Lighthouse 13.5.0, headless Chrome 154, op een Mac.

### De HTML op productie is gelijk aan `dist/`

Met het commando van fase 6 (de `uid` van het island weggelaten): `/ gelijk`, `/en/ gelijk`. Geen `cdn-cgi`, geen beacon, geen `email-protection`; `mailto:hallo@kayhardam.dev` staat er onveranderd op beide pagina's. Geen `X-Robots-Tag`.

### De bestanden met `curl`

Alle 200, met het juiste Content-Type en `X-Content-Type-Options: nosniff`:

| Bestand | Content-Type | Cache-Control | Bytes op productie | Bytes in `dist/` (Mac) |
|---|---|---|--:|--:|
| Hero, AVIF 64w (`kay-hardam.Wcf1GJew_13nNzr.avif`) | `image/avif` | `public, max-age=31536000, immutable` | 874 | 874 |
| Hero, AVIF 128w (`kay-hardam.Wcf1GJew_ZGIYqy.avif`) | `image/avif` | `public, max-age=31536000, immutable` | 1 964 | 1 964 |
| Hero, AVIF 192w (`kay-hardam.Wcf1GJew_Z1dWFSl.avif`) | `image/avif` | `public, max-age=31536000, immutable` | 3 401 | 3 499 |
| `og.png` | `image/png` | `public, max-age=0, must-revalidate` | 15 031 | 15 031 |
| `favicon.svg` | `image/svg+xml` | `public, max-age=0, must-revalidate` | 468 | 468 |
| `favicon.ico` | `image/vnd.microsoft.icon` | `public, max-age=0, must-revalidate` | 1 615 | 1 615 |
| `apple-touch-icon.png` | `image/png` | `public, max-age=0, must-revalidate` | 4 066 | 4 066 |

- **De 64w AVIF is byte voor byte gelijk aan `dist/`.** De 128w is even groot maar niet byte-gelijk, de 192w is de grootte van de Linux-build (3 401), zoals op de preview.
- **`og.png` en de favicons zijn byte voor byte gelijk aan `dist/`:** de bestanden uit `public/`, zonder `immutable` (hun naam heeft geen hash).

### E2E tegen productie

`E2E_BASE_URL=https://kayhardam.dev npx playwright test e2e/photo.spec.ts e2e/security.spec.ts`: 70 tests groen, in Pixel 7 en iPhone 15. Gelijk aan de preview.

### Lighthouse (25 oktober 2026)

Mobiel (standaard), één run per pagina en methode.

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/en/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 0,9 s / 1,1 s / 0 ms / 0 / 0,9 s | 0,8 s / 0,8 s / 0 ms / 0 / 1,1 s |
| `/en/` | 1,1 s / 1,1 s / 0 ms / 0 / 1,1 s | 0,8 s / 0,8 s / 0 ms / 0 / 1,1 s |

- **SEO 100 op `/` en `/en/`,** zoals verwacht: `is-crawlable` slaagt (geen `X-Robots-Tag`), en `image-alt` slaagt, ook met de lege alt van de foto in de hero.
- **De LCP blijft het statement** (`.statement > span.lead`), niet de foto.
- **De foto in de hero** laadt als 128w AVIF (Lighthouse is DPR 1,75), 2,3 KB over het netwerk, prioriteit High. De foto in Over mij als 600w AVIF (17,9 KB), prioriteit Low. Gelijk aan de preview.
- **CLS 0** op beide pagina's en methoden, zoals op de preview. "Improve image delivery" is 0,5 bij devtools en 1 bij simulated, zonder invloed op de score (zoals in fase 7 op productie).
- Nog open: het WhatsApp-voorbeeld met `https://kayhardam.dev/?wa=2` (Kay).

## De keten: vindbaarheid (27 oktober 2026)

Branch `keten-vindbaarheid`, Kays besluit na drie onafhankelijke reviews: de titel in de deellinks, `og.png` met de foto en `og:image:alt`, de links naar de tactieken en oefeningen van Coachboard, een JSON-LD Person en `rel="me"`, het statement en de description zonder "onderwijs", en de naam en de eerste regel van het statement in het eerste scherm op 390 × 844. Gemeten op de Mac met Node 22.22.2, Astro 7.4.0, Playwright 1.64.1 (Chromium en WebKit) en Lighthouse 13.5.0.

### De deellinks met titel

Gemaakt met `encode()` uit de kopie van `format.ts`. Die is gelijk aan Coachboard `main` (`591601f`): `git diff 4ceafd4 origin/main` op de gekopieerde bestanden is leeg.

| Link | Hash (tekens) | Titel | Verder |
|---|--:|---|---|
| NL | 342 | Kruising MO–LO | hetzelfde bord (`sameBoard()`) |
| EN | 338 | Crossing CB–LB | hetzelfde bord (`sameBoard()`) |

Op `handballcoachboard.com` (headless Chromium, 393 px) opent de editor beide links met de titel in de titelknop, zonder fouten op de pagina. Het label boven het veld is nu `board.title`; `src/data/boards.test.ts` toetst de woorden uit de brief.

### `og.png`

| | Was | Nu |
|---|--:|--:|
| Bytes | 15 031 | 142 446 |
| Inkt x | 388–811 | 341–858 |
| Inkt y | 170–460 | 145–485 |
| Marges (links, rechts, boven, onder) | 388, 388, 170, 169 | 341, 341, 145, 144 |

- **Wat erop staat:** de foto (260 px, witte rand van 8 px, `#FFFFFF` op (345, 275)) en het logo (210 px, `#F8FAFC` op (754, 190)), met 48 px ertussen, en `KAYHARDAM.DEV` 34 px eronder. Alles binnen x 285–915. Geen EXIF, ICC, XMP of IPTC.
- **Op 72 px** (het middenvierkant, zoals WhatsApp het compact toont) herken je het gezicht en KH nog; `KAYHARDAM.DEV` is daar niet te lezen, op 300 px breed wel.
- **Het budget** gaat van 19,3 naar 163,8 KB (gemeten plus 15%). Als JPEG zou hij 24,5 KB (kwaliteit 80) of 33,9 KB (90) zijn, maar dan wordt het `og.jpg`; niet gekozen. WhatsApp neemt tot ongeveer 300 KB.

### Het eerste scherm op 390 × 844

In px vanaf de bovenkant van het venster, NL en EN gelijk:

| Venster | Onderkant knop | Naam | Eerste regel statement | Erin? |
|---|--:|---|--:|---|
| 390×844, Chromium | 638,4 | 690,4–714,4 | 782 | ja, 62 px over |
| 390×844, WebKit | 638,4 | 690,4–714,4 | 783 | ja, 61 px over |
| 390×664 (Safari op zo'n iPhone) | 638,4 | 690,4–714,4 | 782 | nee, zoals in fase 8 |

Het stond er al vóór deze branch; `e2e/board-box.spec.ts` toetst het nu, in beide projecten.

### De links in de Coachboard-sectie

`inline-block`, 9 px padding en −9 px marge: elke link 45,2 px hoog, op 393 en 1280 px. De regels van de alinea blijven 27,2 px uit elkaar (op 393 px: 1285, 1312, 1339 en 1366). axe en de focusring (`e2e/a11y.spec.ts`) groen.

### De layout shift als Barlow laat komt

Het statement heeft in het reservelettertype vaak een regel meer dan in Barlow, ook op `main`. Of de hoogte verandert (Chromium, 900 px hoog):

| Breedte | `main` NL | `main` EN | Nu NL | Nu EN |
|--:|---|---|---|---|
| 320 | 142,5 → 114 | 142,5 → 114 | gelijk | gelijk |
| 360 | 142,5 → 114 | 142,5 → 114 | 114 → 85,5 | 114 → 85,5 |
| 393 | gelijk | 142,5 → 114 | 114 → 85,5 | 114 → 85,5 |
| 412 | 114 → 85,5 | gelijk | 114 → 57 | 114 → 85,5 |
| 1280 | 279,6 → 223,7 | 335,5 → 223,7 | gelijk | 279,6 → 223,7 |

De test in `e2e/art.spec.ts` keek alleen naar `/` op 393 px, waar op `main` toevallig niets veranderde. Nu schuift daar de Coachboard-sectie 28,5 px omhoog, met de pass (die in de hero steekt): score 0,0000. De test vergelijkt nu elke verschuiving met die van het statement. De pass en de nummers mogen precies zo ver mee, recht omhoog of omlaag; de header, de kaart en de knop helemaal niet. Hij draait op `/` en `/en/`. Lighthouse: CLS 0.

### De HTML

| Pagina (gzip) | `main` | Nu |
|---|--:|--:|
| `/` | 10 075 B | 10 319 B |
| `/en/` | 10 018 B | 10 243 B |
| `/404.html` | 1 980 B | 1 978 B |

De JSON-LD, `og:image:alt`, de twee links en de langere deellinks maken de pagina's 0,23 KB groter. Gemeten na de description met "Handball Coachboard" (28 oktober); de preview en Lighthouse hieronder zijn van `1da67a7`, met de description daarvoor. Het budget blijft 11,1 KB. JS 21,2 KB, ongewijzigd; het island krijgt alleen de titel erbij.

### Tests

- `npm run verify` groen bij elke commit.
- `npm run e2e`: 495 groen, 7 overgeslagen (de 5 van fase 8, en de layout shift op `/en/` in WebKit, op 393 en 1280 px).

### De preview

`https://keten-vindbaarheid-kayhardam-site.hardamkay.workers.dev/`, commit `1da67a7`:
- de HTML van `/` en `/en/` is gelijk aan `dist/`, op de `uid` van het island na; `/404` is gelijk aan `dist/404.html` (`cmp`). Geen `cdn-cgi` of `email-protection`. De preview stuurt `X-Robots-Tag: noindex`;
- `og.png`: 200, `image/png`, byte voor byte gelijk aan `public/og.png`;
- `E2E_BASE_URL=<preview> npx playwright test e2e/seo.spec.ts e2e/security.spec.ts e2e/page.spec.ts e2e/board.spec.ts e2e/photo.spec.ts`: 166 tests groen, in Pixel 7 en iPhone 15.

### Lighthouse (27 oktober 2026)

Mobiel (standaard), headless Chrome op een Mac, op de preview. Eén run per pagina en methode; `/` simulated twee keer (de eerste had een Speed Index van 1,6 s).

Scores (Performance / Accessibility / Best Practices / SEO):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 100 / 100 / 100 / 69 | 100 / 100 / 100 / 69 |
| `/en/` | 100 / 100 / 100 / 69 | 100 / 100 / 100 / 69 |

Metrics (FCP / LCP / TBT / CLS / Speed Index):

| Pagina | Simulated | Devtools |
|---|---|---|
| `/` | 1,0 s / 1,1 s / 0 ms / 0 / 1,0 s | 0,8 s / 0,8 s / 0 ms / 0 / 1,1 s |
| `/en/` | 1,0 s / 1,2 s / 0 ms / 0 / 1,0 s | 0,8 s / 0,8 s / 0 ms / 0 / 1,1 s |

- **SEO 69,** zoals op elke preview: alleen `is-crawlable` faalt (de `noindex` van de preview). Op productie 100 verwacht.
- **De LCP blijft het statement** (`.statement > span.lead`).
- **CLS 0** op beide pagina's en methoden.
- Na de merge: de meting op productie, het WhatsApp-voorbeeld met `https://kayhardam.dev/?wa=3`, en eventueel de Rich Results Test van Google voor de JSON-LD (Kay).
