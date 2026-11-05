-- Notifications (Phase 8).
--
-- Daily reading reminders are scheduled on the phone itself (expo-notifications),
-- so they need nothing here except profiles.reminder_time, which already exists.
--
-- Encouragement alerts are real push notifications: when a friend sends an
-- encouragement, the database asks Expo's push service to deliver it to the
-- recipient's phone (profiles.push_token). Expo's push API needs no secret key,
-- and pg_net sends the request in the background, so saving an encouragement
-- is never slowed down or blocked by a notification.

-- ---------------------------------------------------------------------------
-- Keep push tokens private
-- ---------------------------------------------------------------------------

-- Overseers and admins can read their leaders' profiles. A push token would let
-- anyone send that phone notifications, so nobody reads it through the API:
-- every column except push_token stays readable (rows are still limited by RLS).
-- Users can still save their own token (the update grant is unchanged).
revoke select on public.profiles from authenticated;
grant select (id, full_name, role, overseer_id, mode, reminder_time, friend_code, created_at)
on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Send a push when someone is encouraged
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create function public.notify_encouragement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_sender text;
  v_words text;
begin
  select push_token into v_token from public.profiles where id = new.recipient_id;
  -- Only Expo push tokens, e.g. ExponentPushToken[xxxx].
  if v_token is null or v_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    return new;
  end if;

  select split_part(full_name, ' ', 1) into v_sender from public.profiles where id = new.sender_id;

  -- The same words as ENCOURAGEMENTS in src/lib/friends.ts (keep them in step).
  v_words := case new.kind
    when 'praying' then '🙏 Praying for you'
    when 'keep_going' then '💪 Keep going!'
    when 'well_done' then '🎉 Well done today!'
    when 'thinking_of_you' then '💛 Thinking of you'
  end;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := jsonb_build_object(
      'to', v_token,
      'title', coalesce(v_sender, 'A friend') || ' encouraged you',
      'body', v_words,
      'sound', 'default',
      'channelId', 'encouragements',
      'data', jsonb_build_object('url', '/friends')
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
  );
  return new;
exception when others then
  -- A notification problem must never stop the encouragement being saved.
  return new;
end;
$$;

revoke execute on function public.notify_encouragement() from public, anon, authenticated;

create trigger encouragements_send_push
after insert on public.encouragements
for each row execute function public.notify_encouragement();
