# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — local dev server at `localhost:4321`
- `npm run build` — static build to `./dist/`
- `npm run preview` — preview production build
- `npm run astro check` — type-check (Astro + TS); prompts to install `@astrojs/check` on first run

Node `>=22.12.0` is required (see `package.json#engines`).

`download_assets.ps1` at the root re-downloads assets from prod via `Invoke-WebRequest` — it silently saves HTML error pages when a file is missing upstream. Verify downloaded files with `file <path>` after running; don't commit without checking.

## Architecture

Static Astro 6 site with **two locales (fr default, en)**, Tailwind, React integration, and a Supabase-backed contact form. Content model is a single `blog` collection; landing/offer pages are hand-crafted Astro components. No backend in this repo — form submissions hit a Supabase Edge Function over HTTPS.

### Routing & i18n

Astro i18n is configured with `prefixDefaultLocale: false` (`astro.config.mjs`):
- French pages live at the root: `/`, `/tarifs`, `/blog/[slug]`
- English pages live under `/en/`: `/en/`, `/en/pricing`, `/en/blog/[slug]`
- The `[lang]` dynamic segment returns `getStaticPaths()` with only `{ lang: 'en' }` — FR has its own top-level pages, EN reuses the same component under `/[lang]/`

Translation helpers in `src/i18n/`:
- `ui.ts` — flat key/value dictionaries `ui.fr` / `ui.en`
- `utils.ts` — `getLangFromUrl(url)` parses the first path segment; `useTranslations(lang)` returns a `t(key)` function with FR fallback

**Page components are shared across locales.** A component reads `getLangFromUrl(Astro.url)` to branch. Two patterns coexist:
- Keys in `src/i18n/ui.ts` via `t('key')` — used by `Home.astro`
- Inline `const t = { fr: {...}, en: {...} }[lang]` objects — used by newer components (`Pricing.astro`, `BookingModal.astro`) to avoid scattering one-off copy across the global dictionary

When adding a new page, create both the FR entry (`src/pages/<slug>.astro`) and the EN entry (`src/pages/[lang]/<slug>.astro`) — both should just import and render the same component.

### Language switch URL mapping

`Footer.astro` builds the cross-locale URL via `getSwitchLangUrl()`. Explicit map: `/` ↔ `/en/`, `/tarifs` ↔ `/en/pricing`, `/mentions-legales` ↔ `/en/legal-notice`, `/cgu` ↔ `/en/terms`, `/confidentialite` ↔ `/en/privacy`. Blog/services slugs are preserved: `/blog/[slug]` ↔ `/en/blog/[slug]`. Fallback to locale home if no match. Update this map when adding new paired pages.

### Content collections

`src/content.config.ts` defines the `blog` collection, loaded via `glob` from `src/content/blog/*.md(x)`. The `lang` field (`fr`/`en`) is how posts are partitioned per locale; `status: 'published'` is required for visibility. Blog pages filter with both at query time (see `Home.astro` and blog list/post pages).

### Components

- **Layout** (`src/layouts/Layout.astro`) — single shared HTML shell (head, SEO, fonts)
- **Navbar** — takes `lang` + optional `transparent` prop. Transparent mode starts as a clear overlay on hero sections and switches to solid `bleu-crepuscule` on scroll (JS listener inside the component). Mobile + desktop "Réserver/Book" CTA carries `data-open-booking` and also `href={pricingUrl}` as fallback navigation
- **ContactForm** — POSTs `{ nom, email, tel, message }` JSON to a hardcoded Supabase Edge Function URL (`https://aeobrpxjmecbvdeqjbvc.supabase.co/functions/v1/contact-form`). Email is required server-side
- **BookingModal** — two-step discovery-call booking triggered by any `[data-open-booking]` element on the page. Step 1 captures name + phone and fires a first "lead captured" POST to the same edge function (using a synthetic `booking-<ts>@be-ikigai.local` email since the real one isn't collected, and embedding a `LEAD-<ts>` correlation id in `message`). Step 2 generates ≤4 upcoming slots (matin 9–12, midi 12–14, soir 18–21, min +2h from now, spanning today/demain/après-demain), then sends a second POST with the same `LEAD-<id>` so the merchant can correlate abandoned-step-1 leads with completed bookings. Injected via `data-open-booking` wiring at the bottom of `BookingModal.astro` — drop the component into any page and add `data-open-booking` to any CTA

### Google Reviews pipeline

`src/components/GoogleReviews.astro` — client-side masonry grid of Google reviews, reads from Supabase `reviews` table via the anon client. Drops anywhere; accepts optional `lang` and `title` props. Shows 9 at a time with a "show more" button; hides the section entirely if no rows are visible.

Backend pipeline (Supabase project `aeobrpxjmecbvdeqjbvc`):
- `sync-google-reviews` edge function — fetches all reviews via Google Business Profile API (OAuth), upserts into `reviews`. Runs daily at 04:00 UTC via `pg_cron`. On upsert, only new rows get `content_original` written; existing rows keep their translations.
- `translate-review` edge function — fires via Postgres trigger (`AFTER INSERT OR UPDATE OF content_original`) when `content_fr` or `content_en` is NULL. Calls Google Cloud Translation API. For reviews whose `original_lang` matches the target, copies `content_original` directly (avoids fr→fr API error).
- Vault secrets (`translate_function_url`, `service_role_key`) replace DB GUC settings — MCP role lacks `ALTER DATABASE` privilege.
- Operator guide: `docs/google-reviews-runbook.md`

**Note:** Google Business Profile API access is pending approval. Reviews are currently seeded manually. When approved, invoke `sync-google-reviews` once to replace seed data.

### Supabase client

`src/lib/supabase.ts` initializes a client from `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`. Used by `GoogleReviews.astro` to read the `reviews` table. Forms still use direct `fetch()` against the edge function URL.

### Styling

Tailwind with a small branded palette (`tailwind.config.mjs`): `bleu-crepuscule` (#2c3e50), `dore-serein` (#ffd700), `beige-chaleureux` (#f5e5d5), plus `comfortaa` font family for headings. Purple `#9333ea` is used literally in class names (not in the palette) as the primary accent on Pricing/CTAs — keep it consistent when adding new components. Reusable background utilities (`.pain-bg`, `.solution-bg`, `.contour-bg`) live in `src/styles/global.css`.

### French copy convention

Avoid decorative capitalization on titles and labels (not Title Case). Capitalize only sentence starts and proper nouns (Ikigai, Pierre-Louis). English titles keep Title Case. This came up repeatedly on `Pricing.astro`; mirror the same rule on new FR pages.

### Images

Use a single `<img>` tag pointing to `.webp` — don't reintroduce `<picture>` with AVIF/JPEG fallbacks (maintenance burden, files drift out of sync). Exception: schema.org JSON-LD, Open Graph, and blog post frontmatter images stay as `.png`/`.jpg` since some social crawlers don't read WebP. `logo_fullhd.png` and `pierre-louis-be-ikigai.png` are intentional PNGs for this reason.

## Blog pipeline (`pipeline/`)

Node ESM pipeline autonome générant des articles FR+EN via Gemini CLI. Voir `.claude/references/PIPELINE.md` pour l'architecture complète.

**Gotchas opérationnels :**
- `gh api graphql` avec body multi-lignes : utiliser `spawnSync` + stdin JSON (pas `execSync` avec interpolation shell — les apostrophes cassent le quoting)
- Gemini CLI en CI headless : requiert `GEMINI_CLI_TRUST_WORKSPACE=true` ET `settings.json` avec `trustedDirectories` dans `GEMINI_CLI_HOME`
- Gemini CLI ignore les fichiers préfixés par `.` — les fichiers de travail temporaires (`card-body.md`, `research-notes.md`) ne doivent PAS avoir de point en préfixe
- GitHub Projects V2 : limite `items(first: 100)` max (pas 200) ; création de champs custom via UI uniquement (mutation GraphQL non exposée)
- Images blog : dossier `public/assets/img/blog/` (pas `public/images/`) pour correspondre à PagesCMS
- Catégories blog (liste fermée PagesCMS) : `Transition professionnelle`, `Sens au travail`, `Coaching`, `Ikigai`, `Philosophie de vie`
- RSS sources actives (2026-04) : Le Monde Emploi, Figaro Emploi, Journal du Net, Parlons RH, Psychologies, Welcome to the Jungle, Maddyness

### Pipeline blog — architecture des sources

`pipeline/collect.js` agrège 4 sources en parallèle : RSS (`RSS_SOURCES`), Reddit (`REDDIT_SOURCES`, 7 subreddits), Serper search sémantique (`collect-search.js`, requiert `SERPER_API_KEY`), et evergreen hardcodé (`evergreen.js`). Le scoring réel utilise `WEIGHTS[sourceType]` — le champ `weight` par source dans `RSS_SOURCES` est du décor non lu par le code.

Google Trends accepte **5 mots-clés max par batch** — au-delà, erreur silencieuse. `LOOKBACK_DAYS=60`, fallback `LOOKBACK_DAYS_EXTENDED=180` pour sources niche sans résultat.

Les statuts GitHub Projects (`Detected` → `Researched` → `Drafting` → `Published`) sont **manuels** — le pipeline ne les avance jamais automatiquement sauf à la création (toujours `Detected`). Une card passée au-delà de `Detected` n'est plus mise à jour par les scans suivants.

**Règle absolue éditoriale** : ne jamais critiquer, moquer ou décrier l'ikigai dans aucun prompt, article ou source — même subtilement. Gravé dans `pipeline/skills-prompt.md` et `pipeline/prompts/1-research.md`.
