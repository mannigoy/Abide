-- Phase 3: daily check-ins.
--
-- Rules enforced here (not just in the app):
--   * One check-in per leader per day                  -> unique (user_id, reading_date)
--   * Only for today or yesterday, in Philippine time  -> insert policy below
--   * Leaders only see and add their own               -> RLS policies below

-- ---------------------------------------------------------------------------
-- Helper: today's date in the Philippines
-- ---------------------------------------------------------------------------

-- A "day" runs midnight to midnight in Asia/Manila, wherever the server is.
create function public.manila_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reading_date date not null,
  -- A reference the leader typed, e.g. "John 3". Never the Bible text itself.
  passage text check (char_length(passage) <= 100),
  -- What the leader wrote in their notebook (typed now; scanned in Phase 5).
  read_text text check (char_length(read_text) <= 5000),
  reflect_text text check (char_length(reflect_text) <= 5000),
  respond_text text check (char_length(respond_text) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reading_date)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.checkins enable row level security;

revoke all on public.checkins from anon, authenticated;
grant select, insert on public.checkins to authenticated;

create policy "Read own check-ins"
on public.checkins for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Add own check-in for today or yesterday"
on public.checkins for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and reading_date between (select public.manila_today()) - 1 and (select public.manila_today())
);

-- No update or delete yet. Editing today's entry is a should-have for later,
-- and overseers' access to check-ins is decided in Phase 6.

-- ---------------------------------------------------------------------------
-- Profiles: the overseer sets a leader's mode, not the leader
-- ---------------------------------------------------------------------------

revoke update (mode) on public.profiles from authenticated;
