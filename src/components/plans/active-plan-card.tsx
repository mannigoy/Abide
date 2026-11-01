import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanIcon } from '@/components/plans/plan-icon';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import type { ActivePlan } from '@/lib/userPlans';

/**
 * - ready: today's plan day hasn't been done yet
 * - done: today's check-in was this plan's day
 * - checked-in: the leader already checked in today without the plan
 *   (one check-in per day), so the plan continues tomorrow
 */
export type TodayStatus = 'ready' | 'done' | 'checked-in';

type ActivePlanCardProps = {
  activePlan: ActivePlan;
  today: TodayStatus;
  onContinue: () => void;
  onPress: () => void;
};

/** The green "My plan" card: where you are in your plan, and today's RRR. */
export function ActivePlanCard({ activePlan, today, onContinue, onPress }: ActivePlanCardProps) {
  const { plan, currentDay, completedDays, totalDays } = activePlan;
  // A number from 0 to 1. The bar's width is this as a percentage.
  const progress = totalDays > 0 ? completedDays / totalDays : 0;

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onPress} accessibilityRole="button">
        <PlanIcon plan={plan} size={44} onDark />
        <View style={styles.headerText}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.subtitle}>
            Day {currentDay} of {totalDays} · Guided RRR
          </Text>
        </View>
      </Pressable>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: totalDays, now: completedDays }}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      {today === 'ready' && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={onContinue}
          accessibilityRole="button">
          <Text style={styles.buttonLabel}>Continue today’s RRR</Text>
        </Pressable>
      )}
      {today === 'done' && (
        <Text style={styles.note}>✓ Done for today. Day {currentDay} opens tomorrow. Well done!</Text>
      )}
      {today === 'checked-in' && (
        <Text style={styles.note}>You’ve already checked in today. Day {currentDay} opens tomorrow.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: Spacing.md,
    borderRadius: 18,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: Colors.surface,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.surface,
    opacity: 0.8,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.primary,
  },
  note: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.surface,
  },
});
