-- Admin tools for the admin website (admin/).
--
-- Admins change other people's role, mode and overseer through these
-- functions, not by editing tables directly. Each one checks that the caller
-- is an admin first, so being "web only" isn't what keeps this safe: the
-- database is.

-- ---------------------------------------------------------------------------
-- Helper: stop unless the caller is an admin
-- ---------------------------------------------------------------------------

create function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select public.my_role()) is distinct from 'admin' then
    raise exception 'Admins only' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.require_admin() from public, anon;
grant execute on function public.require_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Everyone, with their email and last check-in
-- ---------------------------------------------------------------------------

-- Emails live in auth.users, which the app can't read directly. This
-- security definer function reads them for admins only.
create function public.admin_list_people()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role,
  mode public.checkin_mode,
  overseer_id uuid,
  created_at timestamptz,
  last_checkin date
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
  select
    p.id,
    p.full_name,
    u.email::text,
    p.role,
    p.mode,
    p.overseer_id,
    p.created_at,
    (select max(c.reading_date) from public.checkins c where c.user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.full_name;
end;
$$;

revoke execute on function public.admin_list_people() from public, anon;
grant execute on function public.admin_list_people() to authenticated;

-- ---------------------------------------------------------------------------
-- Change someone's role, mode and main overseer
-- ---------------------------------------------------------------------------

create function public.admin_update_profile(
  p_user_id uuid,
  p_role public.user_role,
  p_mode public.checkin_mode,
  p_overseer_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  -- Stops an admin locking themselves out by accident.
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'You can’t remove your own admin role.';
  end if;

  if p_overseer_id = p_user_id then
    raise exception 'Someone can’t be their own overseer.';
  end if;

  if p_overseer_id is not null and not exists (
    select 1 from public.profiles
    where id = p_overseer_id and role in ('overseer', 'admin')
  ) then
    raise exception 'The main overseer must be an overseer or admin.';
  end if;

  update public.profiles
  set role = p_role, mode = p_mode, overseer_id = p_overseer_id
  where id = p_user_id;

  if not found then
    raise exception 'That person no longer exists.';
  end if;
end;
$$;

revoke execute on function public.admin_update_profile(uuid, public.user_role, public.checkin_mode, uuid)
  from public, anon;
grant execute on function public.admin_update_profile(uuid, public.user_role, public.checkin_mode, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Give a group to a different overseer
-- ---------------------------------------------------------------------------

create function public.admin_set_group_overseer(p_group_id uuid, p_overseer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  if not exists (
    select 1 from public.profiles
    where id = p_overseer_id and role in ('overseer', 'admin')
  ) then
    raise exception 'A group’s overseer must be an overseer or admin.';
  end if;

  update public.groups set overseer_id = p_overseer_id where id = p_group_id;

  if not found then
    raise exception 'That group no longer exists.';
  end if;
end;
$$;

revoke execute on function public.admin_set_group_overseer(uuid, uuid) from public, anon;
grant execute on function public.admin_set_group_overseer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admins can remove anyone from a group
-- ---------------------------------------------------------------------------

drop policy "Leave a group, or remove someone from a group you lead" on public.group_members;

create policy "Leave a group, remove someone from a group you lead, or any as admin"
on public.group_members for delete
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.groups g
    where g.id = group_id and g.overseer_id = (select auth.uid())
  )
  or (select public.my_role()) = 'admin'
);
