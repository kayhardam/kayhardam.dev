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
