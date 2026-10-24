import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;
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
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    console.warn('Could not load profile', error.message);
    return null;
  }
  return data;
}

export type LeaderSummary = Pick<Profile, 'id' | 'full_name'>;

/** Leaders assigned to this overseer. RLS only returns leaders whose overseer_id is the signed-in user. */
export async function getMyLeaders(overseerId: string): Promise<LeaderSummary[] | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('overseer_id', overseerId)
    .order('full_name');
  if (error) {
    console.warn('Could not load leaders', error.message);
    return null;
  }
  return data;
}
