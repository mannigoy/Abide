import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Checkin = Tables<'checkins'>;

export type CheckinInput = {
  userId: string;
  readingDate: string;
  passage?: string;
  readText?: string;
  reflectText?: string;
  respondText?: string;
};

/** The leader's check-in for one date, or null if there isn't one. `undefined` means it failed to load. */
export async function getCheckin(userId: string, date: string): Promise<Checkin | null | undefined> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('reading_date', date)
    .maybeSingle();
  if (error) {
    console.warn('Could not load check-in', error.message);
    return undefined;
  }
  return data;
}

/**
 * Saves a check-in. Returns a friendly error message, or null when saved.
 *
 * If the connection drops, it tries again a couple of times. If the server
 * says the check-in already exists, an earlier try got through, so that
 * counts as saved too.
 */
export async function createCheckin(input: CheckinInput): Promise<string | null> {
  const row = {
    user_id: input.userId,
    reading_date: input.readingDate,
    passage: clean(input.passage),
    read_text: clean(input.readText),
    reflect_text: clean(input.reflectText),
    respond_text: clean(input.respondText),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from('checkins').insert(row);
    if (!error) return null;

    switch (error.code) {
      case '23505': // unique violation: already checked in for this day
        return null;
      case '42501': // RLS refused it: the date isn't today or yesterday
        return 'You can only check in for today or yesterday.';
      case '23514': // check constraint: text too long
        return 'That’s a bit long. Please shorten your notes and try again.';
    }
    if (!isNetworkError(error.message)) {
      console.warn('Could not save check-in', error.message);
      return 'Something went wrong saving your check-in. Please try again.';
    }
    // Network problem: wait a moment (1s, then 2s) and try again.
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  return 'Can’t reach the server. Check your internet connection and try again.';
}

/** Empty or whitespace-only fields are stored as null. */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isNetworkError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('network') || lower.includes('fetch');
}
