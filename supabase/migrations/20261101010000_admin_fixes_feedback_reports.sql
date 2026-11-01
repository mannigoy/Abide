-- Admin website: check-in fixes, feedback inbox and monthly report.

-- ---------------------------------------------------------------------------
-- 1. Check-in fixes
-- ---------------------------------------------------------------------------

-- Adjustments can't be for days that haven't happened yet.
drop policy "Admins add adjustments in their own name" on public.streak_adjustments;

create policy "Admins add adjustments in their own name, for past days"
on public.streak_adjustments for insert
to authenticated
with check (
  (select public.my_role()) = 'admin'
  and admin_id = (select auth.uid())
  and reading_date <= (select public.manila_today())
);

/** Removes a check-in made by mistake (e.g. on the wrong day). Admins only. */
create function public.admin_delete_checkin(p_user_id uuid, p_reading_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  delete from public.checkins where user_id = p_user_id and reading_date = p_reading_date;
  if not found then
    raise exception 'There’s no check-in on that day.';
  end if;
end;
$$;

revoke execute on function public.admin_delete_checkin(uuid, date) from public, anon;
grant execute on function public.admin_delete_checkin(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Feedback ("Report a problem" in the phone app)
-- ---------------------------------------------------------------------------

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

revoke all on public.feedback from anon, authenticated;
grant select, insert on public.feedback to authenticated;
grant update (resolved_at) on public.feedback to authenticated;

create policy "See your own feedback; admins see all"
on public.feedback for select
to authenticated
using (user_id = (select auth.uid()) or (select public.my_role()) = 'admin');

create policy "Send feedback as yourself"
on public.feedback for insert
to authenticated
with check (user_id = (select auth.uid()) and resolved_at is null);

create policy "Admins mark feedback resolved"
on public.feedback for update
to authenticated
using ((select public.my_role()) = 'admin')
with check ((select public.my_role()) = 'admin');

/** Feedback with the sender's name and email, newest first. Admins only. */
create function public.admin_list_feedback()
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  message text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_admin();
  return query
  select f.id, f.user_id, p.full_name, u.email::text, f.message, f.created_at, f.resolved_at
  from public.feedback f
  join public.profiles p on p.id = f.user_id
  join auth.users u on u.id = f.user_id
  order by f.resolved_at is not null, f.created_at desc;
end;
$$;

revoke execute on function public.admin_list_feedback() from public, anon;
grant execute on function public.admin_list_feedback() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Monthly report for pastors
-- ---------------------------------------------------------------------------

/** One row per person: days read in the month, current streak and groups. Admins only. */
create function public.admin_monthly_report(p_month date)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.user_role,
  groups text,
  days_read integer,
  current_streak integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date; -- exclusive
begin
  perform public.require_admin();
  return query
  select
    p.id,
    p.full_name,
    u.email::text,
    p.role,
    (
      select string_agg(g.name, ', ' order by g.name)
      from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where gm.user_id = p.id
    ),
    (
      select count(distinct d)::integer from (
        select c.reading_date as d from public.checkins c
        where c.user_id = p.id and c.reading_date >= v_start and c.reading_date < v_end
        union
        select a.reading_date from public.streak_adjustments a
        where a.user_id = p.id and a.reading_date >= v_start and a.reading_date < v_end
      ) days
    ),
    (select s.streak from public.compute_streak(p.id) s)
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.full_name;
end;
$$;

revoke execute on function public.admin_monthly_report(date) from public, anon;
grant execute on function public.admin_monthly_report(date) to authenticated;
