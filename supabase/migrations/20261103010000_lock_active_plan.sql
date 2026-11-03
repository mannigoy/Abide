-- Lock the active plan: a leader finishes the plan they chose before starting
-- another. No pausing, no switching.
--
--   * start_plan refuses while a different plan is active.
--   * pause_plan is removed, so the lock can't be side-stepped.
--   * Plans that were paused before this change can still be resumed, but
--     only when nothing else is active.

drop function if exists public.pause_plan(text);

create or replace function public.start_plan(p_plan_id text)
returns public.user_plans
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_active text;
  v_row public.user_plans;
begin
  if v_user is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select plan_id into v_active
  from public.user_plans
  where user_id = v_user and status = 'active';

  if v_active is not null and v_active <> p_plan_id then
    -- 55000 = "object not in prerequisite state": finish the current plan first.
    raise exception 'Finish your current plan first' using errcode = '55000', detail = v_active;
  end if;

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

revoke all on function public.start_plan(text) from public, anon;
grant execute on function public.start_plan(text) to authenticated;
