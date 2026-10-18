-- Apply in a dedicated Quranly project's SQL Editor. No service keys belong in the app.
begin;
create table if not exists public.quranly_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object')
    check (not (data ?| array['isPro', 'proLicense', 'email'])),
  updated_at timestamptz not null default now()
);
alter table public.quranly_progress enable row level security;
revoke all on public.quranly_progress from anon;
grant select, insert, update, delete on public.quranly_progress to authenticated;
drop policy if exists own_progress on public.quranly_progress;
create policy own_progress on public.quranly_progress for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_quranly_progress(patch jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(patch) <> 'object' or octet_length(patch::text) > 2000000 then
    raise exception 'Invalid progress data';
  end if;
  insert into public.quranly_progress (user_id, data) values (auth.uid(), patch - 'isPro' - 'proLicense' - 'email')
  on conflict (user_id) do update set data = public.quranly_progress.data || excluded.data, updated_at = now();
end;
$$;
revoke execute on function public.save_quranly_progress(jsonb) from public, anon;
grant execute on function public.save_quranly_progress(jsonb) to authenticated;

create table if not exists public.quranly_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (length(type) <= 60),
  payload jsonb not null check (octet_length(payload::text) <= 10000),
  created_at timestamptz not null default now()
);
alter table public.quranly_feedback enable row level security;
revoke all on public.quranly_feedback from anon;
grant select, insert on public.quranly_feedback to authenticated;
drop policy if exists own_feedback_read on public.quranly_feedback;
create policy own_feedback_read on public.quranly_feedback for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists own_feedback_insert on public.quranly_feedback;
create policy own_feedback_insert on public.quranly_feedback for insert to authenticated with check ((select auth.uid()) = user_id);
commit;
