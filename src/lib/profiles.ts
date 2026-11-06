import Storage from 'expo-sqlite/kv-store';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

/** push_token is never read back by the app (only the database uses it to send notifications). */
export type Profile = Omit<Tables<'profiles'>, 'push_token'>;
export type Role = Profile['role'];

export const roleLabels: Record<Role, string> = {
  leader: 'Leader',
  overseer: 'Overseer',
  admin: 'Admin',
};

/** Overseers and admins get the overseer tabs (Today, Leaders); everyone else gets the leader tabs. */
export function usesOverseerTabs(role: Role | undefined): boolean {
  return role === 'overseer' || role === 'admin';
}

/** The signed-in person's own profile. RLS makes sure nobody can read someone else's this way. */
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, overseer_id, mode, reminder_time, friend_code, created_at')
    .eq('id', userId)
    .single();
  if (error) {
    console.warn('Could not load profile', error.message);
    // Offline: use the copy saved last time, so the app still opens.
    return readSavedProfile(userId);
  }
  await Storage.setItem(profileKey(userId), JSON.stringify(data)).catch(() => {});
  return data;
}

const profileKey = (userId: string) => `profile.${userId}`;

async function readSavedProfile(userId: string): Promise<Profile | null> {
  try {
    const saved = await Storage.getItem(profileKey(userId));
    return saved ? (JSON.parse(saved) as Profile) : null;
  } catch {
    return null;
  }
}

/** Removes the saved copy of a profile from this phone (sign-out, account deletion). */
export async function forgetSavedProfile(userId: string) {
  await Storage.removeItem(profileKey(userId)).catch(() => {});
}
