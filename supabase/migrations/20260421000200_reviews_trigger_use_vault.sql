-- Read Vault secrets instead of DB GUC settings (the MCP role cannot ALTER DATABASE).
-- Also adds defensive error handling so trigger failures do not silently swallow rows.
create or replace function public.trigger_translate_review()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  fn_url text;
  svc_key text;
  req_id bigint;
begin
  begin
    select decrypted_secret into fn_url
      from vault.decrypted_secrets where name = 'translate_function_url';
    select decrypted_secret into svc_key
      from vault.decrypted_secrets where name = 'service_role_key';
  exception when others then
    insert into public.sync_logs(job, status, error_message)
    values ('trigger_translate_review', 'error', 'vault read failed: ' || SQLERRM);
    return new;
  end;

  if fn_url is null or svc_key is null then
    insert into public.sync_logs(job, status, error_message)
    values ('trigger_translate_review', 'error',
            'missing vault secret: fn_url=' || coalesce(fn_url,'NULL') ||
            ' svc_key present=' || (svc_key is not null)::text);
    return new;
  end if;

  if new.content_fr is null or new.content_en is null then
    begin
      select net.http_post(
        url := fn_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || svc_key
        ),
        body := jsonb_build_object('review_id', new.id)
      ) into req_id;
    exception when others then
      insert into public.sync_logs(job, status, error_message)
      values ('trigger_translate_review', 'error', 'http_post failed: ' || SQLERRM);
    end;
  end if;

  return new;
end;
$$;
