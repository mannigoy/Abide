import { getRandomBytes } from 'expo-crypto';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type InviteCode = Tables<'invite_codes'>;

// No 0/O or 1/I, so codes are easy to read aloud and type. 32 letters divide
// 256 evenly, so every letter is equally likely.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCode(): string {
  // Secure randomness, so codes can't be guessed. Math.random() isn't safe for this.
  return Array.from(getRandomBytes(CODE_LENGTH), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

/** Codes this overseer made that can still be used. */
export async function getMyActiveInviteCodes(userId: string): Promise<InviteCode[] | null> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('created_by', userId)
    .gt('uses_left', 0)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at');
  if (error) {
    console.warn('Could not load invite codes', error.message);
    return null;
  }
  return data;
}

/**
 * Makes a new single-use code that lasts 30 days (the database default).
 * RLS only allows this for overseers and admins, in their own name.
 */
export async function createInviteCode(userId: string): Promise<InviteCode | null> {
  // A clash with an existing code is very unlikely, but try again if it happens.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('invite_codes')
      .insert({ code: generateCode(), created_by: userId })
      .select()
      .single();
    if (!error) return data;
    if (error.code !== '23505') {
      // 23505 = duplicate key. Anything else is a real problem.
      console.warn('Could not create invite code', error.message);
      return null;
    }
  }
  return null;
}
