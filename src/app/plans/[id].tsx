import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PlanIcon } from '@/components/plans/plan-icon';
import { Screen } from '@/components/screen';
import { Colors, Spacing } from '@/constants/theme';
import { getPlan, type Plan } from '@/lib/plans';
import { useSession } from '@/lib/session';
import { getActivePlan, pausePlan, startPlan } from '@/lib/userPlans';

/**
 * Plan detail, e.g. /plans/john-21-day. The file name `[id].tsx` makes this a
 * dynamic route: the part of the URL in that place arrives as the `id` param.
 *
 * Placeholder for now – the full Plan detail screen comes next. The "(dev)"
 * buttons only exist in development builds (__DEV__), so we can test plan
 * progress before the real "Start this plan" button is designed.
 */
export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const userId = profile?.id;

  // undefined = loading, null = no plan with this id
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [isActive, setIsActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlan(id).then(setPlan);
  }, [id]);

  useEffect(() => {
    if (!userId) return;
    getActivePlan(userId).then((active) => setIsActive(active?.plan.id === id));
  }, [userId, id]);

  async function run(action: (planId: string) => Promise<string | null>, nowActive: boolean) {
    setBusy(true);
    setError(null);
    const message = await action(id);
    setBusy(false);
    if (message) {
      setError(message);
    } else {
      setIsActive(nowActive);
      if (nowActive) router.back(); // back to Plans, where the new "My plan" card shows
    }
  }

  if (plan === undefined) return null;
  if (plan === null) {
    return (
      <Screen>
        <AppText variant="title">Plan not found</AppText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <PlanIcon plan={plan} size={56} />
        <View style={styles.headerText}>
          <AppText variant="heading">{plan.title}</AppText>
          <AppText variant="caption">
            {plan.durationDays} days · {plan.categories.join(', ')}
          </AppText>
        </View>
      </View>
      <AppText>{plan.description}</AppText>

      <Card>
        <AppText variant="caption">Plan detail is coming soon: the days, readings and a “Start this plan” button.</AppText>
      </Card>

      <Pressable onPress={() => Linking.openURL(plan.source.url)}>
        <AppText variant="caption" style={styles.link}>
          Devotional by {plan.source.name}
        </AppText>
      </Pressable>

      {__DEV__ && (
        <View style={styles.dev}>
          <AppText variant="caption">Testing only (not in the real app):</AppText>
          {isActive ? (
            <Button title="Pause this plan (dev)" variant="secondary" loading={busy} onPress={() => run(pausePlan, false)} />
          ) : (
            <Button title="Start this plan (dev)" loading={busy} onPress={() => run(startPlan, true)} />
          )}
          {error && <AppText style={styles.error}>{error}</AppText>}
        </View>
      )}

      <Button title="Back" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  link: {
    color: Colors.primary,
  },
  dev: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.accent,
  },
  error: {
    color: Colors.primary,
  },
});
