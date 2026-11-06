import Storage from 'expo-sqlite/kv-store';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { completePlanDay } from '@/lib/userPlans';

export type Checkin = Tables<'checkins'> & {
  /** True when it's saved on this phone but not sent to the server yet. */
  pending?: boolean;
};

export type CheckinInput = {
  userId: string;
  readingDate: string;
  passage?: string;
  readText?: string;
  reflectText?: string;
  respondText?: string;
  /** Set both when the RRR was a reading plan's day. */
  planId?: string;
  planDay?: number;
};

/**
 * What happened when saving:
 * - saved: it's on the server
 * - queued: no internet, so it's kept on the phone and sent later
 * - error: the server refused it; `message` says why
 */
export type SaveResult = { status: 'saved' } | { status: 'queued' } | { status: 'error'; message: string };

/**
 * The leader's check-in for one date, or null if there isn't one. `undefined`
 * means it failed to load. A check-in still waiting in the outbox counts, so
 * the app shows "checked in" even without internet.
 */
export async function getCheckin(userId: string, date: string): Promise<Checkin | null | undefined> {
  const waiting = (await readOutbox(userId)).find((item) => item.readingDate === date);
  if (waiting) return toPendingCheckin(waiting);

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
 * Saves a check-in, offline first: if there's no internet it goes into the
 * outbox on the phone and is sent later by sendPendingCheckins().
 */
export async function saveCheckin(input: CheckinInput): Promise<SaveResult> {
  const result = await send(input);
  if (result !== 'network') return result;
  await addToOutbox(input);
  return { status: 'queued' };
}

// ---------------------------------------------------------------------------
// Outbox: check-ins saved on the phone while offline
// ---------------------------------------------------------------------------

// One list per person, so on a shared phone nobody's check-in is sent as someone else.
const outboxKey = (userId: string) => `checkins.outbox.${userId}`;

async function readOutbox(userId: string): Promise<CheckinInput[]> {
  try {
    const saved = await Storage.getItem(outboxKey(userId));
    return saved ? (JSON.parse(saved) as CheckinInput[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(userId: string, items: CheckinInput[]) {
  if (items.length === 0) await Storage.removeItem(outboxKey(userId));
  else await Storage.setItem(outboxKey(userId), JSON.stringify(items));
}

async function addToOutbox(input: CheckinInput) {
  // One check-in per day: a newer one for the same date replaces the older.
  const others = (await readOutbox(input.userId)).filter((item) => item.readingDate !== input.readingDate);
  await writeOutbox(input.userId, [...others, input]);
}

// If two screens ask to send at the same time, they share one run, so nothing
// is sent twice.
let sending: Promise<void> | null = null;

/**
 * Sends any check-ins waiting on the phone. Safe to call often (app open,
 * back to the foreground, Home opened). Stops quietly if still offline.
 */
export function sendPendingCheckins(userId: string): Promise<void> {
  sending ??= sendOutbox(userId).finally(() => {
    sending = null;
  });
  return sending;
}

async function sendOutbox(userId: string) {
  const items = await readOutbox(userId);
  if (items.length === 0) return;

  // Dates that are finished with: sent, or refused for good.
  const done = new Set<string>();
  for (const item of items) {
    const result = await send(item, 1);
    if (result === 'network') break; // still offline: keep the rest for next time
    if (result.status === 'error') {
      // The server will never take it (e.g. it's now older than yesterday).
      console.warn('Dropped a waiting check-in', item.readingDate, result.message);
    } else if (item.planId && item.planDay) {
      // Saved, and it was a plan day: move the plan on now.
      await completePlanDay(item.planId, item.planDay);
    }
    done.add(item.readingDate);
  }
  // Re-read before writing, in case another check-in was queued meanwhile.
  const left = (await readOutbox(userId)).filter((item) => !done.has(item.readingDate));
  await writeOutbox(userId, left);
}

/** Removes everything waiting for this person (used when deleting the account). */
export async function forgetPendingCheckins(userId: string) {
  await Storage.removeItem(outboxKey(userId));
}

/** Shows a waiting check-in in the same shape as one from the server. */
function toPendingCheckin(input: CheckinInput): Checkin {
  const row = toRow(input);
  return {
    ...row,
    id: `pending-${input.readingDate}`,
    created_at: '',
    updated_at: '',
    pending: true,
  };
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

function toRow(input: CheckinInput) {
  return {
    user_id: input.userId,
    reading_date: input.readingDate,
    passage: clean(input.passage),
    read_text: clean(input.readText),
    reflect_text: clean(input.reflectText),
    respond_text: clean(input.respondText),
    plan_id: input.planId ?? null,
    plan_day: input.planDay ?? null,
  };
}

/**
 * Sends one check-in. Returns 'network' when the server couldn't be reached
 * after `tries` attempts, so the caller can keep it for later.
 */
async function send(input: CheckinInput, tries = 3): Promise<SaveResult | 'network'> {
  const row = toRow(input);
  for (let attempt = 0; attempt < tries; attempt++) {
    const { error } = await supabase.from('checkins').insert(row);
    if (!error) return { status: 'saved' };

    switch (error.code) {
      case '23505': // unique violation: already checked in for this day (an earlier try got through)
        return { status: 'saved' };
      case '42501': // RLS refused it: the date isn't today or yesterday
        return { status: 'error', message: 'You can only check in for today or yesterday.' };
      case '23514': // check constraint: text too long
        return { status: 'error', message: 'That’s a bit long. Please shorten your notes and try again.' };
    }
    if (!isNetworkError(error.message)) {
      console.warn('Could not save check-in', error.message);
      return { status: 'error', message: 'Something went wrong saving your check-in. Please try again.' };
    }
    // Network problem: wait a moment (1s, then 2s) and try again.
    if (attempt < tries - 1) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  return 'network';
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
