-- A phone's push token belongs to one account at a time.
--
-- If two people use the same phone (one signs out, another signs in), the
-- token must move to the new person; otherwise the first person's
-- encouragement alerts would keep arriving on a phone they no longer use.
-- Saving and clearing the token now only happens through these functions,
-- which take it off every other account first.

-- Clean up any duplicates before adding the rule.
update public.profiles p set push_token = null
where push_token is not null
  and exists (
    select 1 from public.profiles q
    where q.push_token = p.push_token and q.created_at > p.created_at
  );

create unique index profiles_push_token_unique on public.profiles (push_token) where push_token is not null;

-- No more direct writes to push_token from the app.
revoke update (push_token) on public.profiles from authenticated;

/** Saves this phone's token on your profile, and removes it from anyone else's. */
create function public.set_my_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'Not an Expo push token' using errcode = '22023';
  end if;
  update public.profiles set push_token = null where push_token = p_token and id <> auth.uid();
  update public.profiles set push_token = p_token where id = auth.uid();
end;
$$;

/** Stops notifications to your account on this phone (used when signing out). */
create function public.clear_my_push_token()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set push_token = null where id = (select auth.uid());
$$;

revoke execute on function public.set_my_push_token(text) from public, anon;
revoke execute on function public.clear_my_push_token() from public, anon;
grant execute on function public.set_my_push_token(text) to authenticated;
grant execute on function public.clear_my_push_token() to authenticated;
