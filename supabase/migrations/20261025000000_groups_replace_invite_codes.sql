-- Sign-up is open to anyone. Instead of invite codes for the app, each small
-- group (cell group or ministry) has its own join code.
--
-- A new account only sees its own data until it joins a group, so open
-- sign-up doesn't let strangers see anyone else.
--
-- Overseers see the members of the groups they lead. A leader can be in
-- several groups; the first group they join sets their main overseer
-- (profiles.overseer_id), which an admin can change.

-- ---------------------------------------------------------------------------
-- 1. Sign-up no longer needs an invite code
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Fall back to the start of the email (e.g. accounts added in the dashboard).
  v_full_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'New member'
  );
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(v_full_name, 100));
  return new;
end;
$$;

drop function public.is_invite_code_valid(text);
drop table public.invite_codes;

-- ---------------------------------------------------------------------------
-- 2. Groups and members
-- ---------------------------------------------------------------------------

create type public.group_type as enum ('cell_group', 'ministry');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  type public.group_type not null default 'cell_group',
  overseer_id uuid not null references public.profiles (id) on delete cascade,
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now()
);

create index groups_overseer_id_idx on public.groups (overseer_id);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- 3. Helpers (security definer, so policies can use them without RLS loops)
-- ---------------------------------------------------------------------------

/** True if the signed-in user is a member of this group. */
create function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

/** True if the signed-in user leads a group that this user belongs to. */
create function public.oversees(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = p_user_id and g.overseer_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.oversees(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.oversees(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security: groups
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;

revoke all on public.groups from anon, authenticated;
grant select, insert, delete on public.groups to authenticated;
-- The overseer can rename a group or change its code, but not hand it to someone else.
grant update (name, type, join_code) on public.groups to authenticated;

create policy "See groups you lead or belong to; admins see all"
on public.groups for select
to authenticated
using (
  overseer_id = (select auth.uid())
  or public.is_group_member(id)
  or (select public.my_role()) = 'admin'
);

create policy "Overseers and admins create groups they lead"
on public.groups for insert
to authenticated
with check (
  overseer_id = (select auth.uid())
  and (select public.my_role()) in ('overseer', 'admin')
);

create policy "Overseers update their own groups"
on public.groups for update
to authenticated
using (overseer_id = (select auth.uid()))
with check (overseer_id = (select auth.uid()));

create policy "Overseers delete their own groups"
on public.groups for delete
to authenticated
using (overseer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Row Level Security: group_members
-- ---------------------------------------------------------------------------

alter table public.group_members enable row level security;

revoke all on public.group_members from anon, authenticated;
-- No insert grant: joining only happens through join_group() below.
grant select, delete on public.group_members to authenticated;

create policy "See your own memberships and the members of groups you lead"
on public.group_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.groups g
    where g.id = group_id and g.overseer_id = (select auth.uid())
  )
  or (select public.my_role()) = 'admin'
);

create policy "Leave a group, or remove someone from a group you lead"
on public.group_members for delete
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.groups g
    where g.id = group_id and g.overseer_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 6. Profiles: overseers see the members of their groups
-- ---------------------------------------------------------------------------

drop policy "Read own profile, your leaders' profiles, or any profile as admin" on public.profiles;

create policy "Read own profile, your group members' profiles, or any profile as admin"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or overseer_id = (select auth.uid())
  or public.oversees(id)
  or (select public.my_role()) = 'admin'
);

-- ---------------------------------------------------------------------------
-- 7. Joining a group with its code
-- ---------------------------------------------------------------------------

-- security definer: a leader can't see a group before joining it, so this
-- function looks the code up on their behalf. Returns the group's id, or
-- null if the code doesn't match any group.
create function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group_id uuid;
  v_overseer_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in required';
  end if;

  select g.id, g.overseer_id into v_group_id, v_overseer_id
  from public.groups g
  where g.join_code = upper(trim(p_code));

  if v_group_id is null then
    return null;
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, v_user_id)
  on conflict do nothing;

  -- The first group you join sets your main overseer.
  update public.profiles p
  set overseer_id = v_overseer_id
  where p.id = v_user_id
    and p.overseer_id is null
    and v_overseer_id <> v_user_id;

  return v_group_id;
end;
$$;

revoke execute on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;
