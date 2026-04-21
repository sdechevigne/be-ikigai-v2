# Google Reviews integration — design spec

**Date:** 2026-04-21
**Status:** approved
**Owner:** Stanislas de Chevigné

## Goal

Display the full Google Business Profile reviews of Be-Ikigai directly on the site, bilingual (FR/EN), refreshed automatically once per day, with zero coupling to the hosting provider. Reusable Astro component to drop on any page via `<GoogleReviews lang={lang} />`.

## Non-goals

- Real-time freshness (1×/day cron is enough).
- Collecting reviews from other platforms (Trustpilot, Facebook, etc.).
- Replying to reviews from the site (use Google Business app).
- A moderation back-office UI (manual flag toggle in Supabase Studio is sufficient for v1).

## Constraints

- Static Astro site, two locales (fr default, en under `/en/`).
- No new hosting dependency — everything must run inside Supabase (already used for `ContactForm` and `BookingModal`).
- Must respect Google Business Profile API ToS (official API, not scraping).
- Frontend data fetch mirrors the existing pattern: direct client-side fetch to Supabase with the anon key + RLS.

## Architecture overview

```
                              ┌────────────────────────────┐
                              │ Google Business Profile API│
                              └─────────────▲──────────────┘
                                            │ OAuth refresh → access token
                                            │ GET reviews (paginated)
                                            │
  ┌──────────────┐  cron 04:00 UTC   ┌──────┴──────────────┐
  │   pg_cron    │ ────────────────► │ Edge Function:      │
  └──────────────┘                   │ sync-google-reviews │
                                     └──────┬──────────────┘
                                            │ upsert
                                            ▼
                                   ┌────────────────────┐
                                   │ Supabase `reviews` │◄──── RLS read-only (anon, is_visible=true)
                                   └─────┬──────────────┘
                                         │ AFTER INSERT/UPDATE trigger
                                         │ (when content_fr or content_en IS NULL)
                                         ▼ pg_net HTTP POST
                              ┌────────────────────────┐
                              │ Edge Function:         │
                              │ translate-review       │
                              └─────┬──────────────────┘
                                    │ Google Translate API
                                    ▼ UPDATE content_fr / content_en
                           ┌────────────────────┐
                           │ Supabase `reviews` │
                           └─────▲──────────────┘
                                 │ supabase-js from browser
                                 │
                       ┌─────────┴───────────┐
                       │ GoogleReviews.astro │
                       │ (client-side fetch) │
                       └─────────────────────┘
```

## Data model

### Table `reviews`

| column | type | notes |
|---|---|---|
| `id` | `text` PK | Google review resource name (e.g. `accounts/.../locations/.../reviews/AbF...`). Idempotent upsert key. |
| `author_name` | `text` not null | |
| `author_photo_url` | `text` nullable | Google-hosted avatar URL. |
| `rating` | `int2` not null | 1-5. Google returns `STAR_RATING` enum — map to int. |
| `content_original` | `text` not null | Raw Google comment. Source of truth for translation. |
| `content_fr` | `text` nullable | French version. Equals `content_original` when `original_lang = 'fr'`, otherwise filled by `translate-review`. |
| `content_en` | `text` nullable | English version. Equals `content_original` when `original_lang = 'en'`, otherwise filled by `translate-review`. |
| `original_lang` | `text` not null | ISO code detected by Cloud Translation (`fr`, `en`, `es`, etc.). |
| `review_url` | `text` not null | Public link to the business's Google Maps reviews page (see note below). |
| `published_at` | `timestamptz` not null | `createTime` from Google. |
| `updated_at_google` | `timestamptz` nullable | `updateTime` from Google (user can edit their review). |
| `synced_at` | `timestamptz` default `now()` | Last sync run that touched this row. |
| `is_visible` | `boolean` default `true` not null | Manual moderation flag. |

### Table `sync_logs`

| column | type | notes |
|---|---|---|
| `id` | `bigserial` PK | |
| `ran_at` | `timestamptz` default `now()` | |
| `job` | `text` not null | `'sync-google-reviews'` or `'translate-review'`. |
| `status` | `text` not null | `'success'` / `'error'`. |
| `rows_affected` | `int` nullable | Count of inserts/updates. |
| `error_message` | `text` nullable | Trimmed error body if any. |

### RLS policies

- **`reviews`** — enable RLS.
  - `SELECT` policy for `anon` + `authenticated`: `USING (is_visible = true)`.
  - No `INSERT` / `UPDATE` / `DELETE` for public roles — only `service_role` writes (edge functions use the service key).
- **`sync_logs`** — enable RLS. No public read. Only `service_role` writes.

### Indexes

- `CREATE INDEX reviews_visible_published_idx ON reviews (is_visible, published_at DESC);`

### Trigger

```sql
CREATE OR REPLACE FUNCTION trigger_translate_review()
RETURNS trigger AS $$
BEGIN
  IF NEW.content_fr IS NULL OR NEW.content_en IS NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.translate_function_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object('review_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_translate_trigger
AFTER INSERT OR UPDATE OF content_fr, content_en, original_lang ON reviews
FOR EACH ROW EXECUTE FUNCTION trigger_translate_review();
```

GUC settings (`app.translate_function_url`, `app.service_role_key`) set once via `ALTER DATABASE postgres SET ...`.

## Sync flow

### Edge Function `sync-google-reviews`

**Trigger:** `pg_cron` every day at 04:00 UTC.

**Algorithm:**
1. Read secrets from env (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_BUSINESS_ACCOUNT_ID`, `GOOGLE_BUSINESS_LOCATION_ID`, `GOOGLE_PLACE_ID`, `GOOGLE_TRANSLATE_API_KEY`).
2. Exchange refresh token for access token at `https://oauth2.googleapis.com/token`.
3. Paginate `GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews?pageSize=50` until `nextPageToken` is absent. Collect all reviews in-memory (Be-Ikigai's review count is in the low hundreds at most — fits easily).
4. For each review, build the row:
   - `id`: `review.name`
   - `author_name`: `review.reviewer.displayName`
   - `author_photo_url`: `review.reviewer.profilePhotoUrl` (nullable)
   - `rating`: map `STAR_RATING` enum (`ONE`..`FIVE`) to int
   - `content_original`: `review.comment` (raw string from Google).
   - `content_fr` / `content_en`: on insert, fill only the column that matches `original_lang` (the other stays NULL and is filled by `translate-review` via the trigger). On update, preserve existing translations unless the original text changed.
   - `original_lang`: detected via Cloud Translation `detect` API on the raw comment. Called inside `sync-google-reviews` to keep the row self-contained. Cache detection in a local map to avoid redundant calls within the same run.
   - `review_url`: Google's API does not expose a per-review permalink. Store the business's aggregate reviews page: `https://search.google.com/local/reviews?placeid=<GOOGLE_PLACE_ID>`. Same URL for every row; stored per-row for denormalization simplicity. The Place ID is a configured env var (`GOOGLE_PLACE_ID`).
   - `published_at`: `review.createTime`
   - `updated_at_google`: `review.updateTime`
5. `upsert` batch into `reviews` with `onConflict: 'id'`, updating only: `rating`, original content column, `original_lang`, `updated_at_google`, `synced_at`. **Never** overwrite `is_visible` or the translated content (those are managed elsewhere).
6. Write row in `sync_logs`.
7. Return `{ok: true, rows: N}` or `{ok: false, error: '...'}` with HTTP 200 (so pg_cron does not retry blindly — retries are handled by the next scheduled run).

**Error handling:**
- OAuth refresh fail → log to `sync_logs`, abort run.
- API quota / 429 → log, abort (next run will retry naturally).
- Single review parsing error → log, skip that review, continue.

### Edge Function `translate-review`

**Trigger:** Postgres trigger via `pg_net` HTTP POST (async, fire-and-forget).

**Algorithm:**
1. Receive `{review_id}` in body.
2. `SELECT * FROM reviews WHERE id = $1`.
3. Determine missing languages: if `content_fr IS NULL` → translate `content_original` to `fr`. Same for `en`.

Translation logic:
- If `original_lang = 'fr'` → `content_fr = content_original`, translate to `content_en` via Cloud Translation.
- If `original_lang = 'en'` → `content_en = content_original`, translate to `content_fr`.
- Otherwise → translate `content_original` to both `fr` and `en`.

5. Call `POST https://translation.googleapis.com/language/translate/v2?key={GOOGLE_TRANSLATE_API_KEY}` with `q`, `source`, `target`.
6. `UPDATE reviews SET content_fr = ..., content_en = ... WHERE id = $1`.
7. Log to `sync_logs`.

**Idempotency:** the translate function only fills NULL columns. If both are already filled, it's a no-op. Rerunning is safe.

### Cron schedule

```sql
SELECT cron.schedule(
  'sync-reviews-daily',
  '0 4 * * *',
  $$
    SELECT net.http_post(
      url := 'https://<project>.supabase.co/functions/v1/sync-google-reviews',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      )
    );
  $$
);
```

## Frontend component

### File: `src/components/GoogleReviews.astro`

**Props:**
- `lang: 'fr' | 'en'` (required) — selects which column to display.
- `title?: string` — optional override; defaults from the inline i18n dict.

**Behavior:**
- Reads via `supabase.from('reviews').select('*').eq('is_visible', true).order('published_at', { ascending: false })` using the existing `src/lib/supabase.ts` client.
- Initial render: 6 skeleton cards (pulse animation) to avoid CLS.
- On success: render all reviews in a CSS masonry layout (`columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4`), matching the reference screenshot.
- Initially shows 9 reviews; a "Voir plus" / "Show more" button reveals +9 at a time (client-side slicing — all data already fetched).
- Each card: 5-star row (filled according to `rating`), review content truncated at 200 chars with inline expand, avatar + name, `"Voir le témoignage sur Google ↗"` link to `review_url`.
- Aggregate rating line above the grid: `★ 4.9 · N avis clients` (computed from visible dataset).

**States:**
- Loading: skeleton cards.
- Error: `console.error` + hide section silently (no user-facing error message).
- Empty: hide section.

**Styling:** Tailwind using project palette (`bleu-crepuscule` text, `beige-chaleureux` background for the section, cards are white with subtle border). Matches the screenshot aesthetic.

**i18n:** inline dictionary (follows the `Pricing.astro` / `BookingModal.astro` pattern):
```ts
const t = {
  fr: {
    title: 'Ils ont vécu l\'expérience',
    showMore: 'Voir plus d\'avis',
    viewOnGoogle: 'Voir le témoignage sur Google',
    readMore: 'Lire la suite',
    aggregate: (r: string, n: number) => `★ ${r} · ${n} avis clients`,
  },
  en: {
    title: 'They experienced it',
    showMore: 'Show more reviews',
    viewOnGoogle: 'View review on Google',
    readMore: 'Read more',
    aggregate: (r: string, n: number) => `★ ${r} · ${n} client reviews`,
  },
}[lang];
```

**Integration:** imported into any Astro page with `<GoogleReviews lang={lang} />`. For v1, add it to `Home.astro` and `Pricing.astro` (both FR and EN variants automatically via the shared component pattern).

## One-shot setup runbook

### A. Google Cloud project
1. Create project `be-ikigai-reviews` (or reuse existing).
2. Enable APIs: `Google My Business API`, `My Business Account Management API`, `My Business Business Information API`, `Cloud Translation API`.
3. Create an **OAuth 2.0 Client ID** (type "Web application", authorized redirect URI `http://localhost:3000/oauth/callback`).
4. Create an **API key** restricted to Cloud Translation API.
5. Submit the [Google Business Profile API access request form](https://support.google.com/business/contact/api_default) using the project ID. **Wait 1-7 days for approval.**

### B. Bootstrap script `scripts/google-oauth-bootstrap.mjs` (one-shot)

Local Node script that:
1. Starts a tiny HTTP server on `localhost:3000`.
2. Opens the browser to the OAuth consent URL with scope `https://www.googleapis.com/auth/business.manage`.
3. User logs in with the Google account that owns the Be-Ikigai Business Profile.
4. Callback receives `code`, exchanges it at `https://oauth2.googleapis.com/token` for access + refresh tokens.
5. Prints the `refresh_token` to stdout. Copy into Supabase edge function secrets.

### C. Fetch Account ID + Location ID (one-shot curl)
```bash
# Accounts
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://mybusinessaccountmanagement.googleapis.com/v1/accounts

# Locations for the account
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations?readMask=name,title
```
Record `accountId` and `locationId` → store in Supabase secrets.

### D. Supabase provisioning
1. Create migration `supabase/migrations/<timestamp>_google_reviews.sql` with: table `reviews`, table `sync_logs`, RLS, index, trigger, GUC settings.
2. Enable extensions: `pg_cron`, `pg_net` (via Supabase dashboard → Database → Extensions).
3. Deploy edge functions: `supabase functions deploy sync-google-reviews` and `supabase functions deploy translate-review`.
4. Set secrets: `supabase secrets set GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... GOOGLE_OAUTH_REFRESH_TOKEN=... GOOGLE_BUSINESS_ACCOUNT_ID=... GOOGLE_BUSINESS_LOCATION_ID=... GOOGLE_PLACE_ID=... GOOGLE_TRANSLATE_API_KEY=...`.
5. Schedule cron (SQL shown above).
6. Run manual sync once: `curl -X POST https://<project>.supabase.co/functions/v1/sync-google-reviews -H "Authorization: Bearer $SERVICE_ROLE"`.

### E. End-to-end test
- Confirm rows in Supabase Studio → `reviews` table.
- Confirm both `content_fr` and `content_en` populated (trigger fired translate).
- Add `<GoogleReviews lang={lang} />` to a test page.
- Verify FR (`/`) and EN (`/en/`) rendering.

## Testing strategy

- **Edge Function unit tests** (Deno test runner): mock Google API responses, assert correct upsert payload. Cover OAuth refresh, pagination, rating enum mapping, error paths.
- **Translate function tests**: mock Cloud Translation, assert only NULL columns are filled, idempotency.
- **Database tests**: RLS policy tests — anon can read only visible rows, cannot write.
- **Component visual test**: manual — load homepage FR + EN with populated DB, check layout matches screenshot reference.
- **Smoke test**: after deploy, trigger `sync-google-reviews` manually and verify `sync_logs` has a success row.

## Open risks

- **Google Business Profile API approval** — the request form may take up to 7 days or be refused. Fallback if refused: switch to **Option 1 from original brainstorm** (Places API legacy, limited to 5 reviews). Document this fallback but do not implement it preemptively.
- **Refresh token revocation** — if the Google account password changes or the OAuth consent is revoked, the refresh token dies. Mitigation: `sync_logs` error will be visible; document the re-bootstrap procedure.
- **Rating enum drift** — Google may add new enum values. Defensive mapping: anything outside `ONE..FIVE` → log warning, skip row.
- **Translation quality** — automatic translation of French testimonials to English may feel awkward. Acceptable for v1; future enhancement could allow manual override via a `content_en_override` column.

## Out of scope for v1 (future enhancements)

- Admin UI to toggle `is_visible` without opening Supabase Studio.
- Manual translation override column.
- Schema.org JSON-LD `Review` + `AggregateRating` markup for SEO rich snippets.
- Reply-to-review functionality.
- Multi-location support (Be-Ikigai has one location).
