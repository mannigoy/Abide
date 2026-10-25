import type { Database } from '../../../src/lib/database.types';
import { supabase } from './supabase';

type Functions = Database['public']['Functions'];
type Enums = Database['public']['Enums'];

export type Role = Enums['user_role'];
export type Mode = Enums['checkin_mode'];
export type GroupType = Enums['group_type'];
type PersonRow = Functions['admin_list_people']['Returns'][number];
/** Generated types can't tell these columns may be null, so we say so here. */
export type Person = Omit<PersonRow, 'overseer_id' | 'last_checkin'> & {
  overseer_id: string | null;
  last_checkin: string | null;
};

export const roleLabels: Record<Role, string> = { leader: 'Leader', overseer: 'Overseer', admin: 'Admin' };
export const modeLabels: Record<Mode, string> = { guided: 'Guided', simple: 'Simple' };
export const groupTypeLabels: Record<GroupType, string> = { cell_group: 'Cell group', ministry: 'Ministry' };

/** Everyone, with email and last check-in. The database refuses this for non-admins. */
export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase.rpc('admin_list_people');
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePerson(person: Pick<Person, 'id' | 'role' | 'mode' | 'overseer_id'>) {
  const { error } = await supabase.rpc('admin_update_profile', {
    p_user_id: person.id,
    p_role: person.role,
    p_mode: person.mode,
    // The generated type says string, but the function accepts null for "no overseer".
    p_overseer_id: person.overseer_id as string,
  });
  if (error) throw new Error(error.message);
}

export type AdminGroup = {
  id: string;
  name: string;
  type: GroupType;
  join_code: string;
  overseer_id: string;
  members: { id: string; full_name: string }[];
};

/** All groups and their members. RLS lets admins see every group. */
export async function listGroups(): Promise<AdminGroup[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, type, join_code, overseer_id, group_members(profiles(id, full_name))')
    .order('name');
  if (error) throw new Error(error.message);
  return data.map(({ group_members, ...group }) => ({
    ...group,
    members: group_members
      .map((m) => m.profiles)
      .filter((p) => p !== null)
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
  }));
}

export async function setGroupOverseer(groupId: string, overseerId: string) {
  const { error } = await supabase.rpc('admin_set_group_overseer', {
    p_group_id: groupId,
    p_overseer_id: overseerId,
  });
  if (error) throw new Error(error.message);
}

export async function removeMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
