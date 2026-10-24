import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;

/** The signed-in person's own profile. RLS makes sure nobody can read someone else's this way. */
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    console.warn('Could not load profile', error.message);
    return null;
  }
  return data;
}
