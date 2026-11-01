-- Phase 6: streaks with a weekly grace day, and the overseer view.
--
-- Privacy decision: overseers see dates, streaks and the passage read, but
-- never the Read/Reflect/Respond text. The checkins table stays "own rows
-- only"; overseers get information through the functions below, which never
-- return the text.
--
-- Streak rule: count consecutive days read, going back from today. Today
-- doesn't break a streak until it's over. In each Monday–Sunday week
-- (Philippine time) the first missed day is a grace day: the streak carries
-- on, but the grace day doesn't add to the count. A second miss in the same
-- week ends the streak. Days fixed by an admin (streak_adjustments) count as read.

-- ---------------------------------------------------------------------------
-- Admin corrections (e.g. a dead phone battery)
-- ---------------------------------------------------------------------------

create table public.streak_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  reading_date date not null,
  reason text not null check (char_length(trim(reason)) between 1 and 300),
  created_at timestamptz not null default now(),
  unique (user_id, reading_date)
);

-- ---------------------------------------------------------------------------
-- Who may see whose progress
-- ---------------------------------------------------------------------------

/** You, your leaders (by group or as their main overseer), or anyone if you're an admin. */
create function public.can_view_progress(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    or public.oversees(p_user_id)
    or exists (
      select 1 from public.profiles
      where id = p_user_id and overseer_id = (select auth.uid())
    )
    or (select public.my_role()) = 'admin';
$$;

revoke execute on function public.can_view_progress(uuid) from public, anon;
grant execute on function public.can_view_progress(uuid) to authenticated;

alter table public.streak_adjustments enable row level security;

revoke all on public.streak_adjustments from anon, authenticated;
grant select, insert, delete on public.streak_adjustments to authenticated;

create policy "See adjustments for people whose progress you can see"
on public.streak_adjustments for select
to authenticated
using (public.can_view_progress(user_id));

create policy "Admins add adjustments in their own name"
on public.streak_adjustments for insert
to authenticated
with check (
  (select public.my_role()) = 'admin'
  and admin_id = (select auth.uid())
);

create policy "Admins remove adjustments"
on public.streak_adjustments for delete
to authenticated
using ((select public.my_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- Streak calculation (one place, so the app, overseer view and admin agree)
-- ---------------------------------------------------------------------------

/** True if this person read on this day (a check-in or an admin adjustment). */
create function public.read_on(p_user_id uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.checkins where user_id = p_user_id and reading_date = p_day)
      or exists (select 1 from public.streak_adjustments where user_id = p_user_id and reading_date = p_day);
$$;

/** Internal: no access check. Only called from the functions below. */
create function public.compute_streak(
  p_user_id uuid,
  out streak integer,
  out grace_used_this_week boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := public.manila_today();
  v_day date;
  v_week date;
  v_grace_weeks date[] := '{}';
begin
  streak := 0;

  -- Today is still in progress: if they haven't read yet, start from yesterday.
  v_day := case when public.read_on(p_user_id, v_today) then v_today else v_today - 1 end;

  loop
    if public.read_on(p_user_id, v_day) then
      streak := streak + 1;
    else
      -- Stop if there's nothing read before this day (no grace before the first reading).
      exit when not exists (
        select 1 from public.checkins where user_id = p_user_id and reading_date < v_day
        union all
        select 1 from public.streak_adjustments where user_id = p_user_id and reading_date < v_day
      );
      v_week := date_trunc('week', v_day)::date; -- the Monday of that week
      exit when v_week = any (v_grace_weeks);   -- second miss this week: streak ends
      v_grace_weeks := v_grace_weeks || v_week; -- first miss this week: grace day
    end if;
    v_day := v_day - 1;
  end loop;

  grace_used_this_week := date_trunc('week', v_today)::date = any (v_grace_weeks);
end;
$$;

revoke execute on function public.read_on(uuid, date) from public, anon, authenticated;
revoke execute on function public.compute_streak(uuid) from public, anon, authenticated;

/** Someone's current streak, if you're allowed to see their progress. */
create function public.get_streak(p_user_id uuid)
returns table (streak integer, grace_used_this_week boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_view_progress(p_user_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query select s.streak, s.grace_used_this_week from public.compute_streak(p_user_id) s;
end;
$$;

revoke execute on function public.get_streak(uuid) from public, anon;
grant execute on function public.get_streak(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The overseer's "Today" view
-- ---------------------------------------------------------------------------

/** Every leader you oversee (in your groups, or you're their main overseer), with today's status. */
create function public.my_leaders_today()
returns table (
  user_id uuid,
  full_name text,
  mode public.checkin_mode,
  checked_in_today boolean,
  last_read_date date,
  streak integer,
  grace_used_this_week boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_me uuid := (select auth.uid());
  v_today date := public.manila_today();
begin
  return query
  with leaders as (
    select gm.user_id as id
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where g.overseer_id = v_me
    union
    select p.id from public.profiles p where p.overseer_id = v_me
  )
  select
    p.id,
    p.full_name,
    p.mode,
    public.read_on(p.id, v_today),
    greatest(
      (select max(c.reading_date) from public.checkins c where c.user_id = p.id),
      (select max(a.reading_date) from public.streak_adjustments a where a.user_id = p.id)
    ),
    s.streak,
    s.grace_used_this_week
  from leaders l
  join public.profiles p on p.id = l.id
  cross join lateral public.compute_streak(p.id) s
  where p.id <> v_me
  order by p.full_name;
end;
$$;

revoke execute on function public.my_leaders_today() from public, anon;
grant execute on function public.my_leaders_today() to authenticated;

/** Days read in the last p_days days, with the passage (never the RRR text). */
create function public.leader_history(p_user_id uuid, p_days integer)
returns table (reading_date date, passage text, is_adjustment boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_since date := public.manila_today() - (least(greatest(p_days, 1), 366) - 1);
begin
  if not public.can_view_progress(p_user_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
  select c.reading_date, c.passage, false
  from public.checkins c
  where c.user_id = p_user_id and c.reading_date >= v_since
  union all
  select a.reading_date, null::text, true
  from public.streak_adjustments a
  where a.user_id = p_user_id and a.reading_date >= v_since
    and not exists (
      select 1 from public.checkins c2
      where c2.user_id = p_user_id and c2.reading_date = a.reading_date
    )
  order by 1 desc;
end;
$$;

revoke execute on function public.leader_history(uuid, integer) from public, anon;
grant execute on function public.leader_history(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Overseers set a leader's reading mode
-- ---------------------------------------------------------------------------

create function public.overseer_set_mode(p_user_id uuid, p_mode public.checkin_mode)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id = (select auth.uid()) or not public.can_view_progress(p_user_id) then
    raise exception 'Only this leader’s overseer can change their mode.' using errcode = '42501';
  end if;
  update public.profiles set mode = p_mode where id = p_user_id;
end;
$$;

revoke execute on function public.overseer_set_mode(uuid, public.checkin_mode) from public, anon;
grant execute on function public.overseer_set_mode(uuid, public.checkin_mode) to authenticated;
