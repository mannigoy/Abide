-- Friends: leaders add each other with a personal friend code, then see
-- whether their friends have read today (and their streak), and send a quick
-- encouragement.
--
-- Privacy:
--   * You can only add someone with their code, so open sign-up doesn't let
--     strangers find you.
--   * Both sides must agree (request, then accept).
--   * Friends see "read today" and the streak only. Never passages or RRR text.
--   * Encouragements are a fixed set of kind messages, so nothing unkind can be sent.
--
-- Tables can be read directly (your own rows only). Every change goes through
-- the functions below.

-- ---------------------------------------------------------------------------
-- Friend codes on profiles
-- ---------------------------------------------------------------------------

/** 8 characters without look-alikes (no 0/O, 1/I/L), e.g. "K7QM4XRT". */
create function public.new_friend_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = v_code);
  end loop;
  return v_code;
end;
$$;

alter table public.profiles add column friend_code text unique;
update public.profiles set friend_code = public.new_friend_code() where friend_code is null;
alter table public.profiles
  alter column friend_code set default public.new_friend_code(),
  alter column friend_code set not null;
-- profiles only grants update on (full_name, mode, reminder_time, push_token),
-- so nobody can change their friend_code to someone else's.

revoke execute on function public.new_friend_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Friendships
-- ---------------------------------------------------------------------------

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- One friendship per pair, whoever asked first (A→B and B→A can't both exist).
create unique index friendships_one_per_pair
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index friendships_addressee on public.friendships (addressee_id);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

create policy "See your own friendships"
on public.friendships for select
to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

/** True if the two people are accepted friends. */
create function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(p_a, p_b)
      and greatest(requester_id, addressee_id) = greatest(p_a, p_b)
  );
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

/**
 * Send a friend request using someone's code. If they already asked you,
 * this accepts it. Returns 'pending', 'accepted' or 'already', with their name.
 */
create function public.send_friend_request(p_code text)
returns table (status text, friend_name text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_me uuid := auth.uid();
  v_them public.profiles;
  v_existing public.friendships;
begin
  if v_me is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select * into v_them from public.profiles
  where friend_code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  if not found then
    raise exception 'No one has that friend code' using errcode = 'P0002';
  end if;
  if v_them.id = v_me then
    raise exception 'That’s your own code' using errcode = '22023';
  end if;

  select * into v_existing from public.friendships
  where least(requester_id, addressee_id) = least(v_me, v_them.id)
    and greatest(requester_id, addressee_id) = greatest(v_me, v_them.id);

  if found then
    if v_existing.status = 'pending' and v_existing.addressee_id = v_me then
      update public.friendships set status = 'accepted', accepted_at = now()
      where requester_id = v_them.id and addressee_id = v_me;
      return query select 'accepted'::text, v_them.full_name;
    else
      return query select 'already'::text, v_them.full_name;
    end if;
    return;
  end if;

  insert into public.friendships (requester_id, addressee_id) values (v_me, v_them.id);
  return query select 'pending'::text, v_them.full_name;
end;
$$;

/** Accept or decline a request someone sent you. */
create function public.respond_friend_request(p_requester uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_accept then
    update public.friendships set status = 'accepted', accepted_at = now()
    where requester_id = p_requester and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships
    where requester_id = p_requester and addressee_id = auth.uid() and status = 'pending';
  end if;
end;
$$;

/** Unfriend someone, or cancel a request you sent. */
create function public.remove_friend(p_friend uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.friendships
  where (requester_id = auth.uid() and addressee_id = p_friend)
     or (requester_id = p_friend and addressee_id = auth.uid());
end;
$$;

/**
 * Your friends and requests. For accepted friends: whether they've read today
 * and their streak. Nothing else about their reading is shared.
 */
create function public.my_friends()
returns table (
  friend_id uuid,
  full_name text,
  relation text, -- 'friend', 'incoming' (they asked you) or 'outgoing' (you asked them)
  checked_in_today boolean,
  streak integer,
  since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    case
      when f.status = 'accepted' then 'friend'
      when f.addressee_id = (select auth.uid()) then 'incoming'
      else 'outgoing'
    end,
    case when f.status = 'accepted' then public.read_on(p.id, public.manila_today()) end,
    case when f.status = 'accepted' then (public.compute_streak(p.id)).streak end,
    coalesce(f.accepted_at, f.created_at)
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
  where (select auth.uid()) in (f.requester_id, f.addressee_id)
  order by p.full_name;
$$;

revoke execute on function public.send_friend_request(text) from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.my_friends() to authenticated;

-- ---------------------------------------------------------------------------
-- Encouragements
-- ---------------------------------------------------------------------------

create table public.encouragements (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- The words for each kind live in the app (lib/friends.ts).
  kind text not null check (kind in ('praying', 'keep_going', 'well_done', 'thinking_of_you')),
  sent_on date not null default public.manila_today(),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  -- One encouragement per friend per day, so it stays special (and never spammy).
  unique (sender_id, recipient_id, sent_on)
);

create index encouragements_recipient on public.encouragements (recipient_id, created_at desc);

alter table public.encouragements enable row level security;
revoke all on public.encouragements from anon, authenticated;
grant select on public.encouragements to authenticated;

create policy "See encouragements you sent or received"
on public.encouragements for select
to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));

/** Send a friend one of the kind messages. Only works between accepted friends. */
create function public.send_encouragement(p_to uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.are_friends(auth.uid(), p_to) then
    raise exception 'You can only encourage friends' using errcode = '42501';
  end if;
  insert into public.encouragements (sender_id, recipient_id, kind)
  values (auth.uid(), p_to, p_kind);
  -- A second one today raises unique_violation (23505); the app says "already sent today".
end;
$$;

/** Encouragements you received in the last 7 days, newest first, with the sender's name. */
create function public.my_encouragements()
returns table (id uuid, sender_name text, kind text, created_at timestamptz, read_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, p.full_name, e.kind, e.created_at, e.read_at
  from public.encouragements e
  join public.profiles p on p.id = e.sender_id
  where e.recipient_id = (select auth.uid())
    and e.created_at > now() - interval '7 days'
  order by e.created_at desc;
$$;

/** Marks everything you've received as read. */
create function public.mark_encouragements_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.encouragements set read_at = now()
  where recipient_id = (select auth.uid()) and read_at is null;
$$;

revoke execute on function public.send_encouragement(uuid, text) from public, anon;
revoke execute on function public.my_encouragements() from public, anon;
revoke execute on function public.mark_encouragements_read() from public, anon;
grant execute on function public.send_encouragement(uuid, text) to authenticated;
grant execute on function public.my_encouragements() to authenticated;
grant execute on function public.mark_encouragements_read() to authenticated;
