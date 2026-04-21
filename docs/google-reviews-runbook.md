# Google Reviews runbook

Operational guide for the Google Business Profile → Supabase → site reviews pipeline.

## Architecture at a glance

- `sync-google-reviews` edge function — runs daily at 04:00 UTC via `pg_cron`. Fetches all reviews via Google Business Profile API, detects language, upserts into `reviews`.
- `translate-review` edge function — called by Postgres trigger when a row has a NULL `content_fr` or `content_en`. Fills the missing column via Cloud Translation.
- `GoogleReviews.astro` — browser-side renders `reviews` table rows via the anon Supabase client (RLS read-only).

## One-shot setup (run in order)

### 1. Google Cloud
- Create a GCP project (or reuse).
- Enable APIs: `Google My Business API`, `My Business Account Management API`, `My Business Business Information API`, `Cloud Translation API`.
- Credentials → create OAuth 2.0 Client ID (Web application). Add `http://localhost:3000/oauth/callback` as an authorized redirect URI.
- Credentials → create API key restricted to Cloud Translation API.
- Submit Google Business Profile API access request: https://support.google.com/business/contact/api_default — wait 1-7 days.

### 2. Obtain OAuth refresh token

```bash
GOOGLE_OAUTH_CLIENT_ID="<cid>" GOOGLE_OAUTH_CLIENT_SECRET="<csec>" \
  node scripts/google-oauth-bootstrap.mjs
```
Log in with the Google account that owns Be-Ikigai's Business Profile. Copy the printed `refresh_token`.

### 3. Obtain Account ID + Location ID

```bash
GOOGLE_OAUTH_CLIENT_ID="<cid>" GOOGLE_OAUTH_CLIENT_SECRET="<csec>" \
GOOGLE_OAUTH_REFRESH_TOKEN="<rt>" \
  node scripts/fetch-google-ids.mjs
```
Note the numeric ID inside `accounts/<id>` and `locations/<id>`.

### 4. Supabase project link

```bash
npx supabase link --project-ref <project-ref>
```

### 5. Apply database migrations

> ⚠️ **Required before `db push`:** open `supabase/migrations/20260421000100_google_reviews_cron.sql` and replace `<PROJECT_REF>` with your actual Supabase project ref. This placeholder is intentional — the SQL will error out on apply if left unsubstituted.

```bash
npx supabase db push
```

### 6. Seed Vault secrets

The translate trigger and the pg_cron job both read their credentials from Vault (which is more
secure than DB GUC settings and doesn't require `ALTER DATABASE` privileges). In Supabase Studio → SQL editor:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/translate-review',
  'translate_function_url',
  'URL of the translate-review edge function'
);
select vault.create_secret(
  '<service-role-key>',
  'service_role_key',
  'Supabase service role key for the reviews trigger'
);
```

### 7. Deploy edge functions

```bash
npx supabase functions deploy sync-google-reviews
npx supabase functions deploy translate-review
```

### 8. Set secrets

```bash
npx supabase secrets set \
  GOOGLE_OAUTH_CLIENT_ID=<...> \
  GOOGLE_OAUTH_CLIENT_SECRET=<...> \
  GOOGLE_OAUTH_REFRESH_TOKEN=<...> \
  GOOGLE_BUSINESS_ACCOUNT_ID=<...> \
  GOOGLE_BUSINESS_LOCATION_ID=<...> \
  GOOGLE_PLACE_ID=<...> \
  GOOGLE_TRANSLATE_API_KEY=<...>
```
Verify: `npx supabase secrets list`.

### 9. Initial sync

```bash
curl -X POST \
  -H "Authorization: Bearer <service-role-key>" \
  https://<project-ref>.supabase.co/functions/v1/sync-google-reviews
```
Expected: `{"ok":true,"rows":N}`.

### 10. Verify

- Supabase Studio → `reviews` table has rows with `content_original`, `content_fr`, `content_en` all populated.
- `sync_logs` has a `sync-google-reviews` success row and one or more `translate-review` success rows.
- Load `/` and `/en/` — reviews section renders.

## Secrets reference

| key | source |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console → Credentials |
| `GOOGLE_OAUTH_CLIENT_SECRET` | same |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | `scripts/google-oauth-bootstrap.mjs` |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | `scripts/fetch-google-ids.mjs` |
| `GOOGLE_BUSINESS_LOCATION_ID` | same |
| `GOOGLE_PLACE_ID` | https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder |
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Console → Credentials (restricted to Cloud Translation) |

## Manual operations

### Trigger a sync on demand

```bash
curl -X POST -H "Authorization: Bearer <service-role-key>" \
  https://<project-ref>.supabase.co/functions/v1/sync-google-reviews
```
Or: Supabase Studio → Edge Functions → `sync-google-reviews` → "Invoke".

### Hide a review

```sql
update public.reviews set is_visible = false where id = '<review-id>';
```
Site refreshes on next page load (no rebuild needed).

### Re-translate a review

```sql
update public.reviews set content_en = null where id = '<review-id>';
-- trigger fires, translate-review fills content_en again
```

### Refresh token rotation

If `sync_logs` shows `invalid_grant`, the refresh token is dead (user revoked consent, changed password, etc.). Rerun `scripts/google-oauth-bootstrap.mjs` and update the secret:
```bash
npx supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN=<new-rt>
```

## Monitoring

```sql
-- Recent sync activity
select * from public.sync_logs order by ran_at desc limit 20;

-- Reviews missing translations
select id, original_lang, content_fr is null as fr_missing, content_en is null as en_missing
from public.reviews
where content_fr is null or content_en is null;

-- Cron status
select * from cron.job where jobname = 'sync-reviews-daily';
select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'sync-reviews-daily') order by start_time desc limit 10;
```

## Fallback if Google Business Profile API access is denied

Switch to Places Details API (public, no OAuth, limited to 5 reviews per response):
1. Rewrite `sync-google-reviews/google.ts` to call `https://places.googleapis.com/v1/places/<placeId>` with `X-Goog-FieldMask: reviews` and an API key.
2. Keep the rest of the pipeline unchanged.
