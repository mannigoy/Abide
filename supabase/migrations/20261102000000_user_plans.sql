-- Reading plans: which plan each user is on, and which day they're up to.
--
-- The plans themselves (titles, readings, questions) live in the app for now
-- (assets/guided_plans), so plan_id here is the plan's text id, e.g. 'john-21-day'.
--
-- Rules:
--   * One row per user per plan, so pausing and coming back keeps your day.
--   * At most one ACTIVE plan per user (a partial unique index, below).
--   * A day only counts as done when there's a check-in for it. Missing a
--     calendar day never skips a reading.
--   * Users read their own rows directly. All changes go through the three
--     functions below, so nobody can jump ahead without checking in.

-- ---------------------------------------------------------------------------
-- Check-ins remember which plan day they were for (both set, or both empty)
-- ---------------------------------------------------------------------------

alter table public.checkins
  add column plan_id text check (plan_id ~ '^[a-z0-9-]{1,60}$'),
  add column plan_day int check (plan_day between 1 and 366),
  add constraint checkins_plan_both_or_neither check ((plan_id is null) = (plan_day is null));

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.user_plans (
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null check (plan_id ~ '^[a-z0-9-]{1,60}$'),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  -- The day the user is up to. Days before it are done.
  current_day int not null default 1 check (current_day between 1 and 366),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, plan_id)
);

-- A partial unique index only covers the rows that match its WHERE. So a user
-- can have many paused or completed plans, but only one row with status 'active'.
create unique index user_plans_one_active_per_user
on public.user_plans (user_id)
where status = 'active';

-- ---------------------------------------------------------------------------
-- Row Level Security: read your own rows; change them only via the functions
-- ---------------------------------------------------------------------------

alter table public.user_plans enable row level security;

revoke all on public.user_plans from anon, authenticated;
grant select on public.user_plans to authenticated;

create policy "Read own plans"
on public.user_plans for select
to authenticated
using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- start_plan: pause whatever is active, then start or resume this plan.
-- A completed plan starts again from day 1.
-- ---------------------------------------------------------------------------

create or replace function public.start_plan(p_plan_id text)
returns public.user_plans
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_row public.user_plans;
begin
  if v_user is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  update public.user_plans
  set status = 'paused', updated_at = now()
  where user_id = v_user and status = 'active' and plan_id <> p_plan_id;

  insert into public.user_plans (user_id, plan_id)
  values (v_user, p_plan_id)
  on conflict (user_id, plan_id) do update
  set
    status = 'active',
    current_day = case when user_plans.status = 'completed' then 1 else user_plans.current_day end,
    started_at = case when user_plans.status = 'completed' then now() else user_plans.started_at end,
    completed_at = null,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- pause_plan
-- ---------------------------------------------------------------------------

create or replace function public.pause_plan(p_plan_id text)
returns public.user_plans
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_row public.user_plans;
begin
  update public.user_plans
  set status = 'paused', updated_at = now()
  where user_id = auth.uid() and plan_id = p_plan_id and status = 'active'
  returning * into v_row;
  if not found then
    return null; -- that plan wasn't active
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_plan_day: called after a check-in made from a plan.
--   * Only moves forward if p_day is the user's current day (so a double tap
--     can't skip a day) and a check-in for that plan day exists.
--   * After the last day (p_total_days) the plan is marked completed.
-- Returns the row as it is afterwards (unchanged if nothing applied).
-- ---------------------------------------------------------------------------

create or replace function public.complete_plan_day(p_plan_id text, p_day int, p_total_days int)
returns public.user_plans
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_row public.user_plans;
begin
  if p_total_days is null or p_total_days < 1 or p_total_days > 366 then
    raise exception 'Invalid plan length' using errcode = '22023';
  end if;

  select * into v_row
  from public.user_plans
  where user_id = v_user and plan_id = p_plan_id and status = 'active'
  for update; -- lock the row so two calls at once can't both move it forward

  if not found then
    return null;
  end if;
  if v_row.current_day <> p_day then
    return v_row;
  end if;

  if not exists (
    select 1 from public.checkins
    where user_id = v_user and plan_id = p_plan_id and plan_day = p_day
  ) then
    return v_row;
  end if;

  if p_day >= p_total_days then
    update public.user_plans
    set status = 'completed', completed_at = now(), updated_at = now()
    where user_id = v_user and plan_id = p_plan_id
    returning * into v_row;
  else
    update public.user_plans
    set current_day = p_day + 1, updated_at = now()
    where user_id = v_user and plan_id = p_plan_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.start_plan(text) from public, anon;
revoke all on function public.pause_plan(text) from public, anon;
revoke all on function public.complete_plan_day(text, int, int) from public, anon;
grant execute on function public.start_plan(text) to authenticated;
grant execute on function public.pause_plan(text) to authenticated;
grant execute on function public.complete_plan_day(text, int, int) to authenticated;
