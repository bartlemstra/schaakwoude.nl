# schaakwoude.nl

De nieuwe website van Schaakvereniging Schaakwoude in Damwâld. Leden plaatsen zelf
verslagen (met partijen om na te spelen), de agenda staat in je eigen kalender en de
site draait op het gratis plan van Cloudflare.

- **Astro 7** met **[EmDash](https://emdashcms.com)** als CMS (beheer op `/_emdash/admin`, inloggen met passkey of e-maillink)
- **Cloudflare Workers + D1 + R2**, gratis plan: €0 per maand
- Content overgezet uit de oude WordPress-site (2008 tot nu) en de Drupal-site daarvoor

## Wat er in zit (fase 1)

| Onderdeel | Waar |
| --- | --- |
| Voorpagina met agenda, nieuws, teams, archiefpartij, sponsors | `src/pages/index.astro` |
| Nieuws met rubrieken en bladeren, 1100+ berichten sinds 2008 | `src/pages/nieuws/` |
| Agenda per maand, plus `/agenda.ics` om in Google Agenda, Outlook of op de iPhone te abonneren | `src/pages/agenda.astro`, `agenda.ics.ts` |
| Teams (KNSB, FSB) met spelers en netstand-links | `src/pages/teams.astro` |
| Eregalerij sinds 1979/80 en ereleden | `src/pages/eregalerij.astro` |
| Sponsors | `src/pages/sponsors.astro` |
| Vrije pagina's (club, jeugd, competitie, lid worden, reglementen, oude toernooipagina's) | `src/pages/[...slug].astro` |
| Standen (Sevilla) met archief sinds 2018 | `src/pages/standen.astro`, `migratie/sevilla.mjs` |
| Zoeken in het hele archief | `src/pages/zoeken.astro` |
| Blok "Schaakpartij" in de editor: plak een PGN, de site toont een bord | `plugins/schaakpartij/`, `src/scripts/partij.ts` |
| Doorverwijzingen van oude adressen (`/content/...`, oude paginanamen, Drupal) | `src/pages/content/`, `redirects` in de seed |
| RSS-feed | `src/pages/rss.xml.ts` |

### Drie themes

Dezelfde site in drie stijlen, voor het bestuur om uit te kiezen:

- **Fries**: fris en helder, Friese-vlagblauw met pompeblêd-rood
- **Clubblad**: klassiek, krantenkop met schreefletter, groen en messing
- **Toernooi**: donker en sportief, smalle kapitalen en een fel accent

Het thema staat in `src/lib/site.ts` (of via `PUBLIC_THEMA=clubblad`). Met
`PUBLIC_THEMA_KIEZER=1` verschijnt bovenaan elke pagina een kiezer, voor de preview.
Kleuren en lettertypes per thema staan in `src/styles/themas.css`, de opbouw in
`src/styles/basis.css`.

## Lokaal draaien

```bash
pnpm install
pnpm dev                     # http://localhost:4321, beheer op /_emdash/admin
PUBLIC_THEMA_KIEZER=1 pnpm dev   # met themakiezer
```

Bij de eerste start maakt EmDash een lege database aan (lokale D1 in `.wrangler/`).
Open `http://localhost:4321/_emdash/api/setup/dev-bypass?content=0` om zonder
installatiewizard een beheerder aan te maken.

## Content overzetten uit WordPress

De SQL-exports van de oude sites horen **nooit** in deze repository: ze bevatten
e-mailadressen en wachtwoord-hashes. De scripts lezen alleen openbare inhoud.

```bash
# 1. Openbare inhoud uit de SQL-exports halen (gebruikers: alleen de weergavenaam)
python3 migratie/exporteer_wp.py wordpress.sql drupal.sql migratie/uit/wp.json

# 2. Omzetten naar een EmDash-seed: Gutenberg/HTML naar Portable Text,
#    [pgn]-shortcodes naar partijblokken, TablePress naar tabellen, rubrieken, doorverwijzingen
node migratie/naar-seed.mjs migratie/uit/wp.json migratie/uit/seed-met-inhoud.json

# 3. In de lokale database laden (dev-server eerst één keer gestart en gestopt)
npx emdash seed migratie/uit/seed-met-inhoud.json \
  -d .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite --skip-media
```

`migratie/clubdata.mjs` bevat wat niet uit de database te halen was (teams, sponsors,
agenda van de bekende data) en de nieuwe pagina "Lid worden".

De Sevilla-standen (`/ftp/...`) staan in `public/ftp/`, zodat oude links blijven werken.
`/standen` toont de actuele stand per competitie en het archief sinds 2018:

```bash
# ftp.zip van de oude hosting uitpakken, dan (.sev-bestanden gaan niet mee):
node migratie/sevilla.mjs <uitgepakte-map>/ftp
```

Nog niet overgezet: de afbeeldingen (`wp-content/uploads`). Die staan nog op de oude
hosting en worden gelinkt.

## Live zetten (Cloudflare, gratis plan)

```bash
npx wrangler d1 create schaakwoude          # id invullen in wrangler.jsonc
npx wrangler r2 bucket create schaakwoude-media
pnpm run deploy
```

Daarna de lokale database naar D1 kopiëren (`wrangler d1 export` lokaal, `wrangler d1
execute --remote --file`), de afbeeldingen naar R2, en de DNS van schaakwoude.nl naar
Cloudflare.

### Grenzen van het gratis plan

- Worker maximaal 3 MB (gzip). CI controleert dit (`scripts/controleer-grootte.mjs`);
  nu ongeveer 2,7 MB. Daarom levert de beheeromgeving alleen Nederlands en Engels mee.
- 100.000 verzoeken per dag, 10 ms CPU per verzoek. Partijen worden daarom in de
  browser opgebouwd, niet op de server.
- D1: 5 GB opslag, 5 miljoen gelezen rijen per dag.

## Koppelingen (volgende fases)

- **Clubstand**: stand, indeling en uitslagen van de interne competitie komen straks
  via de API van Clubstand op `/competitie`; leden melden zich daar af.
- **Chesslytix**: partijen met één klik analyseren.
