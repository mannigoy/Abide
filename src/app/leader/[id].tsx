import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { StreakCard } from '@/components/streak-card';
import { WeekDots } from '@/components/week-dots';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { formatShortDate } from '@/lib/dates';
import type { Profile } from '@/lib/profiles';
import {
  getLeaderHistory,
  getLeaderProfile,
  getStreak,
  setLeaderMode,
  type HistoryDay,
  type Streak,
} from '@/lib/progress';

type Mode = Profile['mode'];
const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'guided', label: 'Guided', hint: 'Step-by-step Read, Reflect, Respond' },
  { value: 'simple', label: 'Simple', hint: 'One tap to check in' },
];

/**
 * One leader's progress, for their overseer. The file name [id] makes this a
 * dynamic route: /leader/abc-123 opens this screen with id = 'abc-123'.
 */
export default function LeaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [leader, setLeader] = useState<Pick<Profile, 'id' | 'full_name' | 'mode'> | null | undefined>(undefined);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [savingMode, setSavingMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let ignore = false;
      Promise.all([getLeaderProfile(id), getStreak(id), getLeaderHistory(id, 30)]).then(
        ([profile, streakResult, historyResult]) => {
          if (ignore) return;
          setLeader(profile);
          setStreak(streakResult);
          setHistory(historyResult ?? []);
        },
      );
      return () => {
        ignore = true;
      };
    }, [id]),
  );

  async function changeMode(mode: Mode) {
    if (!leader || mode === leader.mode) return;
    setSavingMode(true);
    setError(null);
    const message = await setLeaderMode(leader.id, mode);
    setSavingMode(false);
    if (message) {
      setError(message);
    } else {
      setLeader({ ...leader, mode });
    }
  }

  const header = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.back}>
      <AppText style={styles.backText}>‹ Back</AppText>
    </Pressable>
  );

  if (leader === undefined) {
    return (
      <Screen>
        {header}
        <AppText variant="caption">Loading…</AppText>
      </Screen>
    );
  }

  if (leader === null) {
    return (
      <Screen>
        {header}
        <AppText variant="caption">Couldn’t load this leader. Check your connection.</AppText>
      </Screen>
    );
  }

  const firstName = leader.full_name.split(' ')[0];
  const readDates = new Set(history.map((day) => day.reading_date));
  const passages = history.filter((day) => day.passage);

  return (
    <Screen>
      {header}
      <AppText variant="title">{leader.full_name}</AppText>

      {streak && <StreakCard streak={streak} who={firstName} />}

      <Card>
        <AppText variant="heading">Last 7 days</AppText>
        <WeekDots readDates={readDates} />
        <AppText variant="caption">
          Read on {readDates.size} of the last 30 days.
        </AppText>
      </Card>

      <View style={styles.section}>
        <AppText variant="heading">Recent readings</AppText>
        {passages.length === 0 && <AppText variant="caption">No passages recorded yet.</AppText>}
        {passages.slice(0, 10).map((day) => (
          <View key={day.reading_date} style={styles.passageRow}>
            <AppText variant="caption">{formatShortDate(day.reading_date)}</AppText>
            <AppText>{day.passage}</AppText>
          </View>
        ))}
        <AppText variant="caption">
          {firstName}’s reflections stay private. You see that they read, not what they wrote.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Reading mode</AppText>
        <View style={styles.modeRow}>
          {MODES.map((option) => {
            const selected = leader.mode === option.value;
            return (
              <Pressable
                key={option.value}
                disabled={savingMode}
                onPress={() => changeMode(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.modeOption, selected && styles.modeOptionSelected]}>
                <AppText style={selected ? styles.modeLabelSelected : styles.modeLabel}>{option.label}</AppText>
                <AppText variant="caption">{option.hint}</AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption">Moving from Guided to Simple is a milestone worth celebrating!</AppText>
        {error && <AppText style={styles.error}>{error}</AppText>}
      </View>

      <Button title="Back to Today" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  backText: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
  },
  section: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  passageRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'baseline',
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modeOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  modeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  modeLabel: {
    fontFamily: Fonts.semiBold,
  },
  modeLabelSelected: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  error: {
    color: Colors.primary,
  },
});
