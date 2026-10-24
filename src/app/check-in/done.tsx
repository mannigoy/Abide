import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Spacing } from '@/constants/theme';

const MESSAGES = [
  'Well done! Every day you spend with God matters.',
  'Faithful in the small things. Keep going!',
  // TODO(you): add two more short, encouraging messages here.
];

/** The celebration after a check-in is saved. */
export default function CheckinDoneScreen() {
  // useState with a function runs it once, so the message doesn't change on re-render.
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  return (
    <Screen>
      <View style={styles.center}>
        <AppText style={styles.emoji}>🎉</AppText>
        <AppText variant="title" style={styles.centerText}>
          Checked in!
        </AppText>
        <AppText style={styles.centerText}>{message}</AppText>
      </View>
      <Button title="Back to Home" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl * 2,
    marginBottom: Spacing.xl,
  },
  emoji: {
    fontSize: 64,
    lineHeight: 76,
  },
  centerText: {
    textAlign: 'center',
  },
});
