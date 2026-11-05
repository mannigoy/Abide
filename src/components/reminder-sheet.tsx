import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { formatTime, parseTime, setReminderTime } from '@/lib/notifications';

type ReminderSheetProps = {
  visible: boolean;
  userId: string;
  /** The saved time ('HH:MM:SS'), or null when the reminder is off. */
  current: string | null;
  onClose: () => void;
  /** Called after saving, so the profile reloads. */
  onSaved: () => void;
};

// Every half hour from 4:00 AM to 10:00 PM.
const TIMES = Array.from({ length: 37 }, (_, i) => ({ hour: 4 + Math.floor(i / 2), minute: (i % 2) * 30 }));

/** Pick the time for the daily reading reminder, or turn it off. */
export function ReminderSheet({ visible, userId, current, onClose, onSaved }: ReminderSheetProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = current ? parseTime(current) : null;

  async function save(time: string | null) {
    setSaving(true);
    setError(null);
    const message = await setReminderTime(userId, time);
    setSaving(false);
    if (message) {
      setError(message);
    } else {
      onSaved();
      onClose();
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Daily reminder">
      <AppText variant="caption">
        Pick a time that fits your day. Abide will gently remind you to do your RRR, even without internet.
      </AppText>
      <ScrollView contentContainerStyle={styles.grid}>
        {TIMES.map(({ hour, minute }) => {
          const isSelected = selected?.hour === hour && selected?.minute === minute;
          return (
            <Pressable
              key={`${hour}:${minute}`}
              style={[styles.time, isSelected && styles.timeSelected]}
              disabled={saving}
              onPress={() => save(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}>
              <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>{formatTime(hour, minute)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error && <AppText style={styles.error}>{error}</AppText>}
      {current && <Button title="Turn off reminder" variant="secondary" loading={saving} onPress={() => save(null)} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  time: {
    width: 96,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  timeSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  timeTextSelected: {
    color: Colors.surface,
  },
  error: {
    color: Colors.primary,
  },
});
