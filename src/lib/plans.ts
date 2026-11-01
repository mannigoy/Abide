import johnPlan from '../../assets/guided_plans/john-plan.json';
import lukePlan from '../../assets/guided_plans/luke-plan.json';
import markPlan from '../../assets/guided_plans/mark-plan.json';
import matthewPlan from '../../assets/guided_plans/matthew-plan.json';

import { toPlan, type Plan, type PlanDay, type RawPlan } from '@/lib/plan-data';

export type { Plan, PlanDay, PlanReading } from '@/lib/plan-data';

/**
 * Reading plans. The only place in the app that knows where plans come from.
 *
 * Today they're JSON files bundled into the app (to add a plan, drop its file
 * in assets/guided_plans and import it above). The functions return Promises
 * even though the files are already loaded, so if plans move to Supabase
 * later, only this file changes and screens don't notice.
 */

// Book order, the way they're listed in the app.
const PLANS: Plan[] = [matthewPlan, markPlan, lukePlan, johnPlan].map((raw) => toPlan(raw as RawPlan));

export async function getPlans(): Promise<Plan[]> {
  return PLANS;
}

export async function getPlan(id: string): Promise<Plan | null> {
  return PLANS.find((plan) => plan.id === id) ?? null;
}

export async function getPlanDay(planId: string, dayNumber: number): Promise<PlanDay | null> {
  const plan = await getPlan(planId);
  return plan?.days.find((day) => day.day === dayNumber) ?? null;
}

/** Every category used by at least one plan, A–Z, for the filter chips. */
export async function getCategories(): Promise<string[]> {
  return [...new Set(PLANS.flatMap((plan) => plan.categories))].sort();
}
