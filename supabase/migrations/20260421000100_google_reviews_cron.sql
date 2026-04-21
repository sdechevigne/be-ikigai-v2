-- Daily sync at 04:00 UTC. Reads the service role key from Vault (seeded by
-- 20260421000300_reviews_vault_secrets_seed.sql).
-- BEFORE APPLYING: replace <PROJECT_REF> with the actual Supabase project ref.
select cron.schedule(
  'sync-reviews-daily',
  '0 4 * * *',
  $$
    select net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-google-reviews',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        'Content-Type', 'application/json'
      )
    );
  $$
);
