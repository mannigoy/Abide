import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { FilterChips } from '@/components/filter-chips';
import { ActivePlanCard, type TodayStatus } from '@/components/plans/active-plan-card';
import { PlanCard } from '@/components/plans/plan-card';
import { Screen } from '@/components/screen';
import { Colors, Fonts } from '@/constants/theme';
import { getCheckin } from '@/lib/checkins';
import { manilaDate } from '@/lib/dates';
import { getCategories, getPlans, type Plan } from '@/lib/plans';
import { useSession } from '@/lib/session';
import { completePlanDay, getActivePlan, type ActivePlan } from '@/lib/userPlans';

type PlansViewProps = {
  /** Shown at the top, above "My plan" (the Bible | Plans switch). */
  header: ReactNode;
};

/** The Plans side of the Bible tab: your current plan, and plans to choose from. */
export function PlansView({ header }: PlansViewProps) {
  const { profile } = useSession();
  const userId = profile?.id;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  // undefined = still loading
  const [mine, setMine] = useState<{ activePlan: ActivePlan | null; today: TodayStatus } | undefined>(undefined);

  // The plan list comes with the app, so it only needs loading once.
  useEffect(() => {
    getPlans().then(setPlans);
    getCategories().then(setCategories);
  }, []);

  // Your plan can change on other screens (starting a plan, checking in),
  // so reload it every time this screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      async function load(id: string) {
        let [activePlan, checkin] = await Promise.all([getActivePlan(id), getCheckin(id, manilaDate(0))]);
        // Safety net: today's plan check-in was saved, but the plan didn't move
        // on (e.g. the signal dropped right after saving). Finish it now.
        if (activePlan && checkin?.plan_id === activePlan.plan.id && checkin.plan_day === activePlan.currentDay) {
          await completePlanDay(activePlan.plan.id, activePlan.currentDay);
          activePlan = await getActivePlan(id);
        }
        if (ignore) return;
        let today: TodayStatus = 'ready';
        if (activePlan && checkin) today = checkin.plan_id === activePlan.plan.id ? 'done' : 'checked-in';
        setMine({ activePlan: activePlan ?? null, today });
      }
      load(userId);
      return () => {
        ignore = true;
      };
    }, [userId]),
  );

  const activePlan = mine?.activePlan ?? null;
  // Filtering a list: keep only the plans that pass both tests.
  const visiblePlans = plans.filter(
    (plan) => plan.id !== activePlan?.plan.id && (filter === null || plan.categories.includes(filter)),
  );

  function openPlan(planId: string) {
    // `/plans/[id]` is a dynamic route: one screen file for every plan.
    router.push({ pathname: '/plans/[id]', params: { id: planId } });
  }

  function continueToday(active: ActivePlan) {
    // Opens the guided RRR with this plan day's passage and questions.
    router.push({
      pathname: '/check-in',
      params: { planId: active.plan.id, planDay: String(active.currentDay) },
    });
  }

  return (
    <Screen>
      {header}

      <SectionLabel>My plan</SectionLabel>
      {mine && activePlan && (
        <ActivePlanCard
          activePlan={activePlan}
          today={mine.today}
          onContinue={() => continueToday(activePlan)}
          onPress={() => openPlan(activePlan.plan.id)}
        />
      )}
      {mine && !activePlan && (
        <Card>
          <AppText>📖 Pick a plan to start your guided RRR.</AppText>
          <AppText variant="caption">Each day gives you a passage and questions to reflect on in your notebook.</AppText>
        </Card>
      )}

      <SectionLabel>Find a plan</SectionLabel>
      <FilterChips options={categories} value={filter} onChange={setFilter} />
      <View style={styles.list}>
        {visiblePlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onPress={() => openPlan(plan.id)} />
        ))}
        {visiblePlans.length === 0 && <AppText variant="caption">No other plans in this category yet.</AppText>}
      </View>
    </Screen>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: Colors.textSecondary,
  },
  list: {
    gap: 10,
  },
});
