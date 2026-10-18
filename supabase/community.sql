-- Participation is optional. Private progress and email addresses are never exposed here.
create table public.quranly_community (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 40),
  total_minutes integer not null default 0 check (total_minutes between 0 and 10000000),
  total_xp integer not null default 0 check (total_xp between 0 and 10000000),
  streak integer not null default 0 check (streak between 0 and 100000),
  level_title text not null default 'Reader' check (length(level_title) <= 80),
  updated_at timestamptz not null default now()
);
alter table public.quranly_community enable row level security;
revoke all on public.quranly_community from anon, authenticated;
grant select, insert, update, delete on public.quranly_community to authenticated;
create policy community_members_read on public.quranly_community for select to authenticated using (true);
create policy community_owner_insert on public.quranly_community for insert to authenticated with check ((select auth.uid()) = user_id);
create policy community_owner_update on public.quranly_community for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy community_owner_delete on public.quranly_community for delete to authenticated using ((select auth.uid()) = user_id);
create index quranly_community_rank on public.quranly_community (total_xp desc, streak desc);
