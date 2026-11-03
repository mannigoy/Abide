import type { Tables } from '@/lib/database.types';
import { getPlan, getPlanDay, type Plan, type PlanDay } from '@/lib/plans';
import { supabase } from '@/lib/supabase';

/**
 * Which reading plan a user is on, and how far they've got.
 *
 * Reading is direct (RLS only returns your own rows). Every change goes
 * through a database function (start_plan, complete_plan_day), which keeps
 * the rules in one place: one active plan that must be finished before
 * starting another, and a day only counts when there's a check-in for it.
 */

type UserPlanRow = Tables<'user_plans'>;

export type ActivePlan = {
  plan: Plan;
  /** The day the user is up to (days before it are done). */
  currentDay: number;
  completedDays: number;
  totalDays: number;
  startedAt: string;
};

/** The user's active plan, or null if they have none. `undefined` means it failed to load. */
export async function getActivePlan(userId: string): Promise<ActivePlan | null | undefined> {
  const { data, error } = await supabase
    .from('user_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    console.warn('Could not load active plan', error.message);
    return undefined;
  }
  if (!data) return null;

  // The plan might have been removed from the app since the user started it.
  const plan = await getPlan(data.plan_id);
  if (!plan) return null;
  return {
    plan,
    currentDay: data.current_day,
    completedDays: data.current_day - 1,
    totalDays: plan.durationDays,
    startedAt: data.started_at,
  };
}

export type PlanProgress = {
  status: 'active' | 'paused' | 'completed';
  currentDay: number;
  completedAt: string | null;
};

/**
 * Where the user is in one plan, or null if they've never started it.
 * `undefined` means it failed to load.
 */
export async function getPlanProgress(userId: string, planId: string): Promise<PlanProgress | null | undefined> {
  const { data, error } = await supabase
    .from('user_plans')
    .select('status, current_day, completed_at')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .maybeSingle();
  if (error) {
    console.warn('Could not load plan progress', error.message);
    return undefined;
  }
  if (!data) return null;
  return {
    status: data.status as PlanProgress['status'],
    currentDay: data.current_day,
    completedAt: data.completed_at,
  };
}

/** Today's reading for the user's active plan: passage and questions. Null if no active plan. */
export async function getTodayPlanDay(userId: string): Promise<{ plan: Plan; day: PlanDay } | null> {
  const active = await getActivePlan(userId);
  if (!active) return null;
  const day = await getPlanDay(active.plan.id, active.currentDay);
  return day ? { plan: active.plan, day } : null;
}

/**
 * Starts a plan. Plans are locked: if another plan is active, the database
 * refuses until that one is finished. A completed plan starts again from
 * day 1; a plan paused before plans were locked resumes where it left off.
 * Returns an error message, or null when it worked.
 */
export async function startPlan(planId: string): Promise<string | null> {
  const { error } = await supabase.rpc('start_plan', { p_plan_id: planId });
  if (error) {
    if (error.code === '55000') return 'Finish your current plan first, then you can start this one.';
    console.warn('Could not start plan', error.message);
    return 'Couldn’t start this plan. Check your connection and try again.';
  }
  return null;
}

/**
 * Call after a check-in made from a plan day. Moves the plan to the next day,
 * or marks it completed after the last day. Does nothing if `dayNumber` isn't
 * the current day or there's no check-in for it, so it's safe to call twice.
 * Returns the updated progress row, or null if nothing was active.
 */
export async function completePlanDay(planId: string, dayNumber: number): Promise<UserPlanRow | null> {
  const plan = await getPlan(planId);
  if (!plan) return null;
  const { data, error } = await supabase.rpc('complete_plan_day', {
    p_plan_id: planId,
    p_day: dayNumber,
    p_total_days: plan.durationDays,
  });
  if (error) {
    console.warn('Could not complete plan day', error.message);
    return null;
  }
  return data;
}
