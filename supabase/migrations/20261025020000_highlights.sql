-- Phase 4: verse highlights.
--
-- Only the verse reference is stored (e.g. JHN.3.16), never the Bible text.
-- References are the same in every translation, so a highlight stays put
-- when the reader switches version.

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  verse_id text not null check (verse_id ~ '^[0-9A-Z]{3}\.[0-9]{1,3}\.[0-9]{1,3}$'),
  color text not null check (color in ('yellow', 'green', 'blue', 'pink')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  -- One highlight per verse per person; picking a new colour replaces it.
  unique (user_id, verse_id)
);

alter table public.highlights enable row level security;

revoke all on public.highlights from anon, authenticated;
-- Full update is needed for upsert (insert-or-replace). The policy below
-- still stops anyone moving a highlight to another user.
grant select, insert, update, delete on public.highlights to authenticated;

create policy "Read own highlights"
on public.highlights for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Add own highlights"
on public.highlights for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Change own highlights"
on public.highlights for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Remove own highlights"
on public.highlights for delete
to authenticated
using (user_id = (select auth.uid()));
