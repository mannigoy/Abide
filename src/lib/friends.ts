import { supabase } from '@/lib/supabase';

/**
 * Friends: add each other with a friend code, see who has read today (and
 * their streak), and send one kind message a day. The database decides what
 * friends can see; nothing about passages or RRR notes is ever shared.
 */

export type Friend = {
  id: string;
  name: string;
  /** 'friend', 'incoming' (they asked you) or 'outgoing' (you asked them). */
  relation: 'friend' | 'incoming' | 'outgoing';
  /** Only for accepted friends. */
  readToday: boolean;
  streak: number;
};

/** The kind messages friends can send. Keys match the database. */
export const ENCOURAGEMENTS = {
  praying: '🙏 Praying for you',
  keep_going: '💪 Keep going!',
  well_done: '🎉 Well done today!',
  thinking_of_you: '💛 Thinking of you',
} as const;

export type EncouragementKind = keyof typeof ENCOURAGEMENTS;

export type Encouragement = {
  id: string;
  from: string;
  kind: EncouragementKind;
  createdAt: string;
  read: boolean;
};

/** Your own friend code, to share. */
export async function getMyFriendCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('friend_code').eq('id', userId).single();
  if (error) {
    console.warn('Could not load friend code', error.message);
    return null;
  }
  return data.friend_code;
}

/** Friends and requests, A–Z. Null if it couldn't load. */
export async function getFriends(): Promise<Friend[] | null> {
  const { data, error } = await supabase.rpc('my_friends');
  if (error) {
    console.warn('Could not load friends', error.message);
    return null;
  }
  return data.map((row) => ({
    id: row.friend_id,
    name: row.full_name,
    relation: row.relation as Friend['relation'],
    readToday: row.checked_in_today ?? false,
    streak: row.streak ?? 0,
  }));
}

/**
 * Sends a friend request with someone's code. Returns a message to show:
 * `ok` is false when something went wrong.
 */
export async function addFriend(code: string): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.rpc('send_friend_request', { p_code: code });
  if (error) {
    if (error.code === 'P0002') return { ok: false, message: 'No one has that code. Please check it and try again.' };
    if (error.code === '22023') return { ok: false, message: 'That’s your own code. Share it with a friend instead!' };
    console.warn('Could not add friend', error.message);
    return { ok: false, message: 'Couldn’t send that. Check your connection and try again.' };
  }
  const { status, friend_name: name } = data[0];
  if (status === 'accepted') return { ok: true, message: `You and ${name} are now friends! 🎉` };
  if (status === 'already') return { ok: true, message: `You’ve already added ${name}.` };
  return { ok: true, message: `Request sent to ${name}. They’ll see it in their Friends tab.` };
}

/** Accept or decline a request. Returns an error message, or null. */
export async function answerRequest(friendId: string, accept: boolean): Promise<string | null> {
  const { error } = await supabase.rpc('respond_friend_request', { p_requester: friendId, p_accept: accept });
  if (error) {
    console.warn('Could not answer friend request', error.message);
    return 'Couldn’t do that. Check your connection and try again.';
  }
  return null;
}

/** Unfriend, or cancel a request you sent. Returns an error message, or null. */
export async function removeFriend(friendId: string): Promise<string | null> {
  const { error } = await supabase.rpc('remove_friend', { p_friend: friendId });
  if (error) {
    console.warn('Could not remove friend', error.message);
    return 'Couldn’t do that. Check your connection and try again.';
  }
  return null;
}

/** Sends one of the kind messages. Returns an error message, or null when sent. */
export async function encourage(friendId: string, kind: EncouragementKind): Promise<string | null> {
  const { error } = await supabase.rpc('send_encouragement', { p_to: friendId, p_kind: kind });
  if (error) {
    if (error.code === '23505') return 'You’ve already encouraged them today. Try again tomorrow!';
    console.warn('Could not send encouragement', error.message);
    return 'Couldn’t send that. Check your connection and try again.';
  }
  return null;
}

/** Encouragements you received in the last 7 days, newest first. */
export async function getEncouragements(): Promise<Encouragement[] | null> {
  const { data, error } = await supabase.rpc('my_encouragements');
  if (error) {
    console.warn('Could not load encouragements', error.message);
    return null;
  }
  return data
    .filter((row) => row.kind in ENCOURAGEMENTS)
    .map((row) => ({
      id: row.id,
      from: row.sender_name,
      kind: row.kind as EncouragementKind,
      createdAt: row.created_at,
      read: row.read_at !== null,
    }));
}

export async function markEncouragementsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_encouragements_read');
  if (error) console.warn('Could not mark encouragements read', error.message);
}
