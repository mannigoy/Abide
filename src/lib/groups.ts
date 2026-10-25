import { getRandomBytes } from 'expo-crypto';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Group = Tables<'groups'>;
export type GroupType = Group['type'];

export const groupTypeLabels: Record<GroupType, string> = {
  cell_group: 'Cell group',
  ministry: 'Ministry',
};

/** A group the signed-in overseer leads, with its members. */
export type LedGroup = Pick<Group, 'id' | 'name' | 'type' | 'join_code'> & {
  members: { id: string; full_name: string }[];
};

/** A group the signed-in user belongs to. */
export type MemberGroup = Pick<Group, 'id' | 'name' | 'type'>;

// No 0/O or 1/I, so codes are easy to read aloud and type. 32 letters divide
// 256 evenly, so every letter is equally likely.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCode(): string {
  // Secure randomness, so codes can't be guessed. Math.random() isn't safe for this.
  return Array.from(getRandomBytes(CODE_LENGTH), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

/** Groups this overseer leads, each with its members' names. */
export async function getGroupsILead(userId: string): Promise<LedGroup[] | null> {
  // The nested select follows foreign keys: groups → group_members → profiles.
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, type, join_code, group_members(profiles(id, full_name))')
    .eq('overseer_id', userId)
    .order('created_at');
  if (error) {
    console.warn('Could not load groups', error.message);
    return null;
  }
  return data.map(({ group_members, ...group }) => ({
    ...group,
    members: group_members
      .map((m) => m.profiles)
      .filter((p) => p !== null)
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
  }));
}

/** Groups the signed-in user has joined. */
export async function getMyGroups(userId: string): Promise<MemberGroup[] | null> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(id, name, type)')
    .eq('user_id', userId)
    .order('joined_at');
  if (error) {
    console.warn('Could not load your groups', error.message);
    return null;
  }
  return data.map((m) => m.groups).filter((g) => g !== null);
}

/**
 * Creates a group led by this overseer, with a fresh join code.
 * RLS only allows this for overseers and admins, in their own name.
 */
export async function createGroup(userId: string, name: string, type: GroupType): Promise<string | null> {
  // A clash with an existing code is very unlikely, but try again if it happens.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), type, overseer_id: userId, join_code: generateCode() });
    if (!error) return null;
    if (error.code !== '23505') {
      // 23505 = duplicate key. Anything else is a real problem.
      console.warn('Could not create group', error.message);
      return 'Couldn’t create the group. Check your connection and try again.';
    }
  }
  return 'Couldn’t create the group. Please try again.';
}

/** Joins a group with its code. Returns a friendly error message, or null when joined. */
export async function joinGroup(code: string): Promise<string | null> {
  const { data: groupId, error } = await supabase.rpc('join_group', { p_code: code });
  if (error) {
    console.warn('Could not join group', error.message);
    return 'Couldn’t join right now. Check your connection and try again.';
  }
  if (!groupId) {
    return 'That code doesn’t match a group. Check it with your overseer and try again.';
  }
  return null;
}
