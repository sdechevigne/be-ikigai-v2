-- Google Business Profile reviews
create extension if not exists pg_net with schema extensions;

create table public.reviews (
  id text primary key,
  author_name text not null,
  author_photo_url text,
  rating smallint not null check (rating between 1 and 5),
  content_original text not null,
  content_fr text,
  content_en text,
  original_lang text not null,
  review_url text not null,
  published_at timestamptz not null,
  updated_at_google timestamptz,
  synced_at timestamptz not null default now(),
  is_visible boolean not null default true
);

create index reviews_visible_published_idx
  on public.reviews (is_visible, published_at desc);

create table public.sync_logs (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  job text not null,
  status text not null check (status in ('success','error')),
  rows_affected integer,
  error_message text
);

-- RLS
alter table public.reviews enable row level security;
alter table public.sync_logs enable row level security;

create policy "public reads visible reviews"
  on public.reviews for select
  using (is_visible = true);

-- No public policies on sync_logs → only service_role can read/write.

-- Trigger: call translate-review edge function when translations are missing.
create or replace function public.trigger_translate_review()
returns trigger
language plpgsql
security definer
as $$
declare
  fn_url text := current_setting('app.translate_function_url', true);
  svc_key text := current_setting('app.service_role_key', true);
begin
  if fn_url is null or svc_key is null then
    return new;
  end if;

  if new.content_fr is null or new.content_en is null then
    perform net.http_post(
      url := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || svc_key
      ),
      body := jsonb_build_object('review_id', new.id)
    );
  end if;

  return new;
end;
$$;

create trigger reviews_translate_trigger
  after insert or update of content_original, content_fr, content_en, original_lang
  on public.reviews
  for each row execute function public.trigger_translate_review();
