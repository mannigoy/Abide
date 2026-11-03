-- My Bible Heroes: which heroes (badges) each user has unlocked.
--
-- The heroes themselves (names, stories, how to unlock) live in app code
-- (src/lib/heroes.ts); this table only remembers that a hero was unlocked and
-- when, so it stays unlocked even if a streak later breaks.
--
-- The app checks the unlock rules and adds rows for the user. Heroes are
-- personal encouragement, not a competition, so we let users add their own.
-- They can't change unlocked_at (always "now") and can't delete rows.

create table public.user_badges (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  badge_key text not null check (badge_key ~ '^[a-z0-9_-]{1,40}$'),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.user_badges enable row level security;

revoke all on public.user_badges from anon, authenticated;
grant select on public.user_badges to authenticated;
-- Column grant: only these two columns can be given, so unlocked_at is always the real time.
grant insert (user_id, badge_key) on public.user_badges to authenticated;

-- Your own heroes, and (later) your leaders' heroes if you oversee them.
create policy "See heroes of people whose progress you can see"
on public.user_badges for select
to authenticated
using (public.can_view_progress(user_id));

create policy "Unlock your own heroes"
on public.user_badges for insert
to authenticated
with check (user_id = (select auth.uid()));
