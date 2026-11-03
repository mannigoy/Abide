import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { manilaDate, manilaWeekDates, weekdayLetter } from '@/lib/dates';
import type { Streak } from '@/lib/progress';

type StreakWeekCardProps = {
  streak: Streak;
  /** Days read this week (and grace-day adjustments), as 'YYYY-MM-DD'. */
  readDates: Set<string>;
};

/** The green card on Home: your streak, the grace day, and Monday–Sunday this week. */
export function StreakWeekCard({ streak, readDates }: StreakWeekCardProps) {
  const today = manilaDate(0);
  const title =
    streak.streak > 0 ? `${streak.streak}-day streak` : 'Start a new streak';
  const subtitle =
    streak.streak === 0
      ? 'Today’s reading starts it.'
      : streak.graceUsedThisWeek
        ? 'Grace day used this week, still going!'
        : '1 grace day left this week';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flame}>
          <SymbolView
            name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
            size={24}
            tintColor={Colors.surface}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.week}>
        {manilaWeekDates().map((date) => {
          const read = readDates.has(date);
          const isToday = date === today;
          return (
            <View
              key={date}
              style={styles.day}
              accessibilityLabel={`${date}: ${read ? 'read' : isToday ? 'today, not yet' : 'not read'}`}>
              <View style={[styles.dot, read ? styles.dotRead : isToday ? styles.dotToday : styles.dotEmpty]}>
                {read && (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={16}
                    tintColor={Colors.surface}
                  />
                )}
              </View>
              <Text style={styles.dayLetter}>{weekdayLetter(date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.surface,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.surface,
    opacity: 0.8,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRead: {
    backgroundColor: Colors.accent,
  },
  dotToday: {
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  dotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dayLetter: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.surface,
    opacity: 0.8,
  },
});
