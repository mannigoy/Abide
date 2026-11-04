-- Account deletion: Google Play requires apps with sign-up to let people
-- delete their account (and its data) from inside the app.
--
-- Deleting the auth.users row removes the profile, and every user table
-- cascades from profiles: checkins, highlights, user_plans, friendships,
-- encouragements, feedback, group_members and streak_adjustments.
-- profiles.overseer_id (their leaders) and streak_adjustments.admin_id are
-- set to null, so other people's data stays.
--
-- Watch out: groups.overseer_id is `on delete cascade`, so deleting an
-- overseer would delete their whole groups and everyone's memberships.
-- So this refuses while you still lead a group. An admin moves the groups to
-- another overseer first (admin_set_group_overseer).

-- security definer: only the database owner may delete from auth.users.
-- It only ever deletes the caller (auth.uid()), never anyone else.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  if exists (select 1 from public.groups g where g.overseer_id = v_user_id) then
    raise exception 'You still lead a group' using errcode = '55000';
  end if;

  delete from auth.users u where u.id = v_user_id;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
