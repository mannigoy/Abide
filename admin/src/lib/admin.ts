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

// ---------------------------------------------------------------------------
// Check-in fixes
// ---------------------------------------------------------------------------

export type HistoryDay = { reading_date: string; passage: string | null; is_adjustment: boolean };
export type Adjustment = { id: string; reading_date: string; reason: string; created_at: string };

/** Days read in the last `days` days (check-ins and adjustments). Never the RRR text. */
export async function getHistory(userId: string, days: number): Promise<HistoryDay[]> {
  const { data, error } = await supabase.rpc('leader_history', { p_user_id: userId, p_days: days });
  if (error) throw new Error(error.message);
  return data as HistoryDay[];
}

export async function getStreak(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_streak', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data[0]?.streak ?? 0;
}

export async function getAdjustments(userId: string): Promise<Adjustment[]> {
  const { data, error } = await supabase
    .from('streak_adjustments')
    .select('id, reading_date, reason, created_at')
    .eq('user_id', userId)
    .order('reading_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function addAdjustment(userId: string, adminId: string, readingDate: string, reason: string) {
  const { error } = await supabase
    .from('streak_adjustments')
    .insert({ user_id: userId, admin_id: adminId, reading_date: readingDate, reason: reason.trim() });
  if (error) {
    throw new Error(error.code === '23505' ? 'That day already has an adjustment.' : error.message);
  }
}

export async function removeAdjustment(id: string) {
  const { error } = await supabase.from('streak_adjustments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCheckin(userId: string, readingDate: string) {
  const { error } = await supabase.rpc('admin_delete_checkin', { p_user_id: userId, p_reading_date: readingDate });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

type FeedbackRow = Functions['admin_list_feedback']['Returns'][number];
export type Feedback = Omit<FeedbackRow, 'resolved_at'> & { resolved_at: string | null };

export async function listFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase.rpc('admin_list_feedback');
  if (error) throw new Error(error.message);
  return data as Feedback[];
}

export async function setFeedbackResolved(id: string, resolved: boolean) {
  const { error } = await supabase
    .from('feedback')
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Monthly report
// ---------------------------------------------------------------------------

type ReportRow = Functions['admin_monthly_report']['Returns'][number];
export type MonthlyReportRow = Omit<ReportRow, 'groups'> & { groups: string | null };

/** `month` is 'YYYY-MM'. */
export async function getMonthlyReport(month: string): Promise<MonthlyReportRow[]> {
  const { data, error } = await supabase.rpc('admin_monthly_report', { p_month: `${month}-01` });
  if (error) throw new Error(error.message);
  return data as MonthlyReportRow[];
}
