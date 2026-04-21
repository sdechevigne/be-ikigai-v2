-- One-shot seed of Vault secrets used by the reviews translate trigger and pg_cron.
-- Re-running is safe: vault.create_secret is idempotent on name collision (raises unique violation,
-- which we swallow). Replace the placeholder values before applying in a new environment.
do $$
begin
  begin
    perform vault.create_secret(
      '<TRANSLATE_FUNCTION_URL>',
      'translate_function_url',
      'URL of the translate-review edge function, called by the reviews translate trigger'
    );
  exception when unique_violation then null;
  end;

  begin
    perform vault.create_secret(
      '<SERVICE_ROLE_KEY>',
      'service_role_key',
      'Supabase service role key, used by the reviews translate trigger to authenticate to the edge function'
    );
  exception when unique_violation then null;
  end;
end $$;
