# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — local dev server at `localhost:4321`
- `npm run build` — static build to `./dist/`
- `npm run preview` — preview production build
- `npm run astro check` — type-check (Astro + TS); prompts to install `@astrojs/check` on first run

Node `>=22.12.0` is required (see `package.json#engines`).

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

### Content collections

`src/content.config.ts` defines the `blog` collection, loaded via `glob` from `src/content/blog/*.md(x)`. The `lang` field (`fr`/`en`) is how posts are partitioned per locale; `status: 'published'` is required for visibility. Blog pages filter with both at query time (see `Home.astro` and blog list/post pages).

### Components

- **Layout** (`src/layouts/Layout.astro`) — single shared HTML shell (head, SEO, fonts)
- **Navbar** — takes `lang` + optional `transparent` prop. Transparent mode starts as a clear overlay on hero sections and switches to solid `bleu-crepuscule` on scroll (JS listener inside the component). Mobile + desktop "Réserver/Book" CTA carries `data-open-booking` and also `href={pricingUrl}` as fallback navigation
- **ContactForm** — POSTs `{ nom, email, tel, message }` JSON to a hardcoded Supabase Edge Function URL (`https://aeobrpxjmecbvdeqjbvc.supabase.co/functions/v1/contact-form`). Email is required server-side
- **BookingModal** — two-step discovery-call booking triggered by any `[data-open-booking]` element on the page. Step 1 captures name + phone and fires a first "lead captured" POST to the same edge function (using a synthetic `booking-<ts>@be-ikigai.local` email since the real one isn't collected, and embedding a `LEAD-<ts>` correlation id in `message`). Step 2 generates ≤4 upcoming slots (matin 9–12, midi 12–14, soir 18–21, min +2h from now, spanning today/demain/après-demain), then sends a second POST with the same `LEAD-<id>` so the merchant can correlate abandoned-step-1 leads with completed bookings. Injected via `data-open-booking` wiring at the bottom of `BookingModal.astro` — drop the component into any page and add `data-open-booking` to any CTA

### Supabase client

`src/lib/supabase.ts` initializes a client from `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`. Currently unused by components — forms use direct `fetch()` against the edge function URL. If you add DB-reading features, prefer this client over new fetch calls.

### Styling

Tailwind with a small branded palette (`tailwind.config.mjs`): `bleu-crepuscule` (#2c3e50), `dore-serein` (#ffd700), `beige-chaleureux` (#f5e5d5), plus `comfortaa` font family for headings. Purple `#9333ea` is used literally in class names (not in the palette) as the primary accent on Pricing/CTAs — keep it consistent when adding new components. Reusable background utilities (`.pain-bg`, `.solution-bg`, `.contour-bg`) live in `src/styles/global.css`.

### French copy convention

Avoid decorative capitalization on titles and labels (not Title Case). Capitalize only sentence starts and proper nouns (Ikigai, Pierre-Louis). English titles keep Title Case. This came up repeatedly on `Pricing.astro`; mirror the same rule on new FR pages.
