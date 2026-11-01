import type { Database } from '@/lib/database.types';
import type { Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

/**
 * Streaks and the overseer view. All of this comes from database functions
 * that check who's asking, and that never return Read/Reflect/Respond text.
 */

type Functions = Database['public']['Functions'];

export type Streak = { streak: number; graceUsedThisWeek: boolean };

type LeaderTodayRow = Functions['my_leaders_today']['Returns'][number];
/** Generated types can't tell that last_read_date may be null, so we say so here. */
export type LeaderToday = Omit<LeaderTodayRow, 'last_read_date'> & { last_read_date: string | null };

type HistoryRow = Functions['leader_history']['Returns'][number];
export type HistoryDay = Omit<HistoryRow, 'passage'> & { passage: string | null };

/** Current streak for you, or for a leader you oversee. */
export async function getStreak(userId: string): Promise<Streak | null> {
  const { data, error } = await supabase.rpc('get_streak', { p_user_id: userId });
  if (error || !data[0]) {
    if (error) console.warn('Could not load streak', error.message);
    return null;
  }
  return { streak: data[0].streak, graceUsedThisWeek: data[0].grace_used_this_week };
}

/** Everyone you oversee, with whether they've read today and their streak. */
export async function getLeadersToday(): Promise<LeaderToday[] | null> {
  const { data, error } = await supabase.rpc('my_leaders_today');
  if (error) {
    console.warn('Could not load leaders', error.message);
    return null;
  }
  return data;
}

/** Days read in the last `days` days (newest first), with the passage. */
export async function getLeaderHistory(userId: string, days: number): Promise<HistoryDay[] | null> {
  const { data, error } = await supabase.rpc('leader_history', { p_user_id: userId, p_days: days });
  if (error) {
    console.warn('Could not load history', error.message);
    return null;
  }
  return data;
}

/** A leader's name and mode. RLS lets overseers read their leaders' profiles. */
export async function getLeaderProfile(userId: string): Promise<Pick<Profile, 'id' | 'full_name' | 'mode'> | null> {
  const { data, error } = await supabase.from('profiles').select('id, full_name, mode').eq('id', userId).single();
  if (error) {
    console.warn('Could not load leader', error.message);
    return null;
  }
  return data;
}

/** Overseers move a leader between Guided and Simple. Returns an error message, or null. */
export async function setLeaderMode(userId: string, mode: Profile['mode']): Promise<string | null> {
  const { error } = await supabase.rpc('overseer_set_mode', { p_user_id: userId, p_mode: mode });
  if (error) {
    console.warn('Could not change mode', error.message);
    return 'Couldn’t change the mode. Please try again.';
  }
  return null;
}
