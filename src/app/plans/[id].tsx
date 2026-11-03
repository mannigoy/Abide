import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PlanIcon } from '@/components/plans/plan-icon';
import { Screen } from '@/components/screen';
import { Colors, Fonts, Spacing, TileColors, TileInkColors } from '@/constants/theme';
import { getPlan, type Plan } from '@/lib/plans';
import { useSession } from '@/lib/session';
import {
  getActivePlan,
  getPlanProgress,
  startPlan,
  type ActivePlan,
  type PlanProgress,
} from '@/lib/userPlans';

/** How many days to list before "+ N more days". */
const PREVIEW_DAYS = 4;

/**
 * Plan detail, e.g. /plans/john-21-day. The file name `[id].tsx` makes this a
 * dynamic route: the part of the URL in that place arrives as the `id` param.
 */
export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const userId = profile?.id;

  // undefined = loading, null = no plan with this id
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  // Where the user is in this plan, and which plan is active right now.
  const [mine, setMine] = useState<{ progress: PlanProgress | null; active: ActivePlan | null } | undefined>(
    undefined,
  );
  const [showAllDays, setShowAllDays] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlan(id).then(setPlan);
  }, [id]);

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    Promise.all([getPlanProgress(userId, id), getActivePlan(userId)]).then(([progress, active]) => {
      if (!ignore) setMine({ progress: progress ?? null, active: active ?? null });
    });
    return () => {
      ignore = true;
    };
  }, [userId, id]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/bible');
  }

  async function handleStart() {
    setBusy(true);
    setError(null);
    const message = await startPlan(id);
    setBusy(false);
    if (message) {
      setError(message);
    } else {
      goBack(); // back to Plans, where the "My plan" card now shows this plan
    }
  }

  if (plan === undefined) return null;
  if (plan === null) {
    return (
      <Screen>
        <BackHeader onPress={goBack} />
        <AppText>We couldn’t find this plan.</AppText>
      </Screen>
    );
  }

  const progress = mine?.progress ?? null;
  // Plans are locked: while another plan is active, this one can't start.
  const otherActive = mine?.active && mine.active.plan.id !== plan.id ? mine.active.plan : null;
  const days = showAllDays ? plan.days : plan.days.slice(0, PREVIEW_DAYS);
  const moreDays = plan.days.length - PREVIEW_DAYS;
  const ink = TileInkColors[plan.tileColor];

  return (
    <Screen>
      <BackHeader onPress={goBack} />

      <View style={[styles.hero, { backgroundColor: TileColors[plan.tileColor] }]}>
        <PlanIcon plan={plan} size={52} onDark />
        <Text style={styles.title}>{plan.title}</Text>
        <View style={styles.pills}>
          <Text style={[styles.pill, { color: ink }]}>{plan.durationDays} days</Text>
          <Text style={[styles.pill, { color: ink }]}>Guided RRR</Text>
        </View>
        <Text style={styles.description}>{plan.description}</Text>
        <Pressable style={styles.credit} onPress={() => Linking.openURL(plan.source.url)} accessibilityRole="link">
          <SymbolView
            name={{ ios: 'person.2', android: 'group', web: 'group' }}
            size={14}
            tintColor={Colors.textSecondary}
          />
          <Text style={styles.creditText}>Devotional by {plan.source.name}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>WHAT YOU’LL READ</Text>
      <View style={styles.dayList}>
        {days.map((day, index) => {
          const done = progress !== null && (progress.status === 'completed' || day.day < progress.currentDay);
          return (
            <View key={day.day} style={[styles.dayRow, index < days.length - 1 && styles.dayRowBorder]}>
              <View style={[styles.dayNumber, done && styles.dayNumberDone]}>
                <Text style={[styles.dayNumberText, done && styles.dayNumberTextDone]}>
                  {done ? '✓' : day.day}
                </Text>
              </View>
              <View style={styles.dayText}>
                <Text style={styles.dayPassage}>{day.passage}</Text>
                <Text style={styles.dayTitle} numberOfLines={1}>
                  {day.title}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      {moreDays > 0 && (
        <Pressable onPress={() => setShowAllDays(!showAllDays)} accessibilityRole="button">
          <Text style={styles.more}>
            {showAllDays ? 'Show fewer days' : `+ ${moreDays} more days`}
            {' · each day has Reflect questions written for that passage'}
          </Text>
        </Pressable>
      )}

      {/* What the button does depends on where the user is with this plan. */}
      {mine && (
        <View style={styles.footer}>
          {progress?.status === 'active' && (
            <Text style={styles.note}>
              You’re on Day {progress.currentDay} of {plan.durationDays}. Finish this plan to choose another. Find
              it under “My plan” in the Bible tab.
            </Text>
          )}
          {progress?.status !== 'active' && otherActive && (
            <View style={styles.locked}>
              <Text style={styles.lockedTitle}>🔒 Finish {otherActive.title} first</Text>
              <Text style={styles.note}>
                You’re on Day {mine.active?.currentDay} of {otherActive.durationDays}. When you finish it, you can
                start this plan.
              </Text>
            </View>
          )}
          {progress?.status !== 'active' && !otherActive && (
            <>
              {progress?.status === 'completed' && (
                <Text style={styles.note}>🎉 You finished this plan. You can read it again from Day 1.</Text>
              )}
              <Text style={styles.note}>Once you start, you’ll finish this plan before choosing another.</Text>
              <Button
                title={
                  progress?.status === 'paused'
                    ? `Resume at Day ${progress.currentDay}`
                    : progress?.status === 'completed'
                      ? 'Start again'
                      : 'Start this plan'
                }
                loading={busy}
                onPress={handleStart}
              />
            </>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    </Screen>
  );
}

function BackHeader({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.header} onPress={onPress} accessibilityRole="button" accessibilityLabel="Back">
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={24}
        tintColor={Colors.text}
      />
      <Text style={styles.headerTitle}>Plan</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: Colors.text,
  },
  hero: {
    gap: 10,
    padding: 18,
    borderRadius: 20,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.text,
  },
  pills: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  credit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: Colors.textSecondary,
  },
  dayList: {
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  dayRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.track,
  },
  dayNumberDone: {
    backgroundColor: Colors.primary,
  },
  dayNumberText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dayNumberTextDone: {
    color: Colors.surface,
  },
  dayText: {
    flex: 1,
    gap: 1,
  },
  dayPassage: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  dayTitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  more: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footer: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  note: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  locked: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: Colors.track,
  },
  lockedTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    textAlign: 'center',
    color: Colors.text,
  },
  error: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    color: Colors.primary,
  },
});
