import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Colors, Spacing } from '@/constants/theme';
import { isScanAvailable, scanNotebookPage, type ScanSource } from '@/lib/notebook-scan';
import { splitRrr, type RrrText } from '@/lib/rrr-text';

const MESSAGES = {
  'no-permission': 'Abide needs permission to use the camera or photos. You can allow it in your phone’s Settings.',
  'no-text': 'We couldn’t find any writing in that photo. Try again in good light, or type it below.',
  error: 'Something went wrong reading the page. Try again, or type it below.',
} as const;

type NotebookScanButtonsProps = {
  onScanned: (text: RrrText) => void;
};

/** "Take a photo" / "Choose from gallery". Hidden where scanning isn't available (Expo Go). */
export function NotebookScanButtons({ onScanned }: NotebookScanButtonsProps) {
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isScanAvailable) {
    return (
      <AppText variant="caption">
        Scanning your notebook works in the full Abide app. For now, type a few words below.
      </AppText>
    );
  }

  async function handleScan(source: ScanSource) {
    setMessage(null);
    setReading(true);
    const outcome = await scanNotebookPage(source);
    setReading(false);
    if (outcome.status === 'ok') {
      onScanned(splitRrr(outcome.lines));
    } else if (outcome.status !== 'cancelled') {
      setMessage(MESSAGES[outcome.status]);
    }
  }

  if (reading) {
    return (
      <View style={styles.reading}>
        <ActivityIndicator color={Colors.primary} />
        <AppText variant="caption">Reading your handwriting…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppText variant="caption">
        Tip: write “Read”, “Reflect” and “Respond” as headings so the app can sort your page.
        The photo stays on your phone and is deleted right after.
      </AppText>
      <View style={styles.row}>
        <View style={styles.button}>
          <Button title="Take a photo" onPress={() => handleScan('camera')} />
        </View>
        <View style={styles.button}>
          <Button title="From gallery" variant="secondary" onPress={() => handleScan('library')} />
        </View>
      </View>
      {message && <AppText style={styles.message}>{message}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  message: {
    color: Colors.primary,
  },
});
