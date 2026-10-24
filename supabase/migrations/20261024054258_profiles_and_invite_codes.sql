-- Phase 2: profiles, invite codes, and sign-up via invite code.
--
-- How sign-up works:
--   1. The app calls supabase.auth.signUp() with full_name and invite_code in the user metadata.
--   2. Supabase inserts a row into auth.users.
--   3. The trigger at the bottom of this file checks the invite code, uses it up,
--      and creates the matching profile. If the code is bad, it raises an error
--      and the whole sign-up is cancelled.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('leader', 'overseer', 'admin');
create type public.checkin_mode as enum ('guided', 'simple');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 100),
  role public.user_role not null default 'leader',
  overseer_id uuid references public.profiles (id) on delete set null,
  mode public.checkin_mode not null default 'guided',
  reminder_time time,
  push_token text,
  created_at timestamptz not null default now()
);

create index profiles_overseer_id_idx on public.profiles (overseer_id);

create table public.invite_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6,12}$'),
  -- The overseer who made the code. Leaders who sign up with it are assigned to them.
  -- Null means it was created by an admin in the Supabase dashboard (e.g. the very first code).
  created_by uuid references public.profiles (id) on delete cascade,
  uses_left integer not null default 1 check (uses_left >= 0),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index invite_codes_created_by_idx on public.invite_codes (created_by);

-- ---------------------------------------------------------------------------
-- Helper: the signed-in user's role
-- ---------------------------------------------------------------------------

-- `security definer` runs this with the owner's rights, so it can read profiles
-- without going through RLS. Without it, a profiles policy that checks the role
-- would have to query profiles again, and loop forever.
create function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Table privileges decide *which columns* a signed-in user may touch;
-- RLS policies decide *which rows*. Users can't change their own role or overseer.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, mode, reminder_time, push_token) on public.profiles to authenticated;

create policy "Read own profile, your leaders' profiles, or any profile as admin"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or overseer_id = (select auth.uid())
  or (select public.my_role()) = 'admin'
);

create policy "Update own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- No insert policy: profiles are only created by the sign-up trigger below.

-- ---------------------------------------------------------------------------
-- Row Level Security: invite_codes
-- ---------------------------------------------------------------------------

alter table public.invite_codes enable row level security;

revoke all on public.invite_codes from anon, authenticated;
grant select, insert, delete on public.invite_codes to authenticated;

create policy "Overseers and admins read their own codes; admins read all"
on public.invite_codes for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select public.my_role()) = 'admin'
);

create policy "Overseers and admins create codes in their own name"
on public.invite_codes for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select public.my_role()) in ('overseer', 'admin')
);

create policy "Overseers and admins delete their own codes"
on public.invite_codes for delete
to authenticated
using (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Invite code pre-check (lets the sign-up screen say "that code isn't valid"
-- before the person fills in everything else). Returns only true/false.
-- ---------------------------------------------------------------------------

create function public.is_invite_code_valid(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.invite_codes
    where code = upper(trim(p_code))
      and uses_left > 0
      and expires_at > now()
  );
$$;

revoke execute on function public.is_invite_code_valid(text) from public;
grant execute on function public.is_invite_code_valid(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up trigger: check the invite code and create the profile
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(new.raw_user_meta_data ->> 'invite_code'));
  v_full_name text := trim(new.raw_user_meta_data ->> 'full_name');
  v_code_found boolean;
  v_overseer_id uuid;
begin
  if v_full_name is null or v_full_name = '' then
    raise exception 'Full name is required';
  end if;

  -- Use up one use of the code. The row lock taken by UPDATE means two people
  -- signing up at the same moment can't both use the last remaining use.
  update public.invite_codes
  set uses_left = uses_left - 1
  where code = v_code
    and uses_left > 0
    and expires_at > now()
  returning true, created_by into v_code_found, v_overseer_id;

  if v_code_found is null then
    raise exception 'Invalid or expired invite code';
  end if;

  insert into public.profiles (id, full_name, role, overseer_id)
  values (new.id, v_full_name, 'leader', v_overseer_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
