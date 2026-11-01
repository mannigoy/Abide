import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Spacing } from '@/constants/theme';
import { manilaDate, weekdayLetter } from '@/lib/dates';

type WeekDotsProps = {
  /** Dates read, as 'YYYY-MM-DD'. */
  readDates: Set<string>;
};

/** The last 7 days, oldest on the left: a filled dot for each day read. */
export function WeekDots({ readDates }: WeekDotsProps) {
  const days = Array.from({ length: 7 }, (_, i) => manilaDate(i - 6));

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const read = readDates.has(day);
        return (
          <View key={day} style={styles.day} accessibilityLabel={`${day}: ${read ? 'read' : 'not read'}`}>
            <View style={[styles.dot, read && styles.dotRead]} />
            <AppText variant="caption">{weekdayLetter(day)}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dotRead: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
});
