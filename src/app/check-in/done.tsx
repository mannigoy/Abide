import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Spacing } from '@/constants/theme';

const MESSAGES = [
  'Well done! Every day you spend with God matters.',
  'Faithful in the small things. Keep going!',
  'You are making a difference!',
  'You are doing great! Keep it up!',
  'Your efforts are noticed and appreciated!',
];

/** The celebration after a check-in is saved. */
export default function CheckinDoneScreen() {
  // useState with a function runs it once, so the message doesn't change on re-render.
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  // Set when the check-in was a reading plan's day, e.g. "Day 3 of 21 done in John…".
  // `queued` is set when there was no internet: the check-in is waiting on the phone.
  const { planMessage, queued } = useLocalSearchParams<{ planMessage?: string; queued?: string }>();

  return (
    <Screen>
      <View style={styles.center}>
        <AppText style={styles.emoji}>🎉</AppText>
        <AppText variant="title" style={styles.centerText}>
          Checked in!
        </AppText>
        <AppText style={styles.centerText}>{message}</AppText>
      </View>
      {queued && (
        <Card>
          <AppText>📶 No internet right now, so it’s saved on your phone. It will send by itself when you’re back online.</AppText>
        </Card>
      )}
      {planMessage && (
        <Card highlight>
          <AppText>📖 {planMessage}</AppText>
        </Card>
      )}
      <Button title={planMessage ? 'Done' : 'Back to Home'} onPress={() => router.back()} />
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
