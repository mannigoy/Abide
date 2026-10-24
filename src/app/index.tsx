import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <Screen>
      <AppText variant="title">Good morning</AppText>
      <AppText variant="caption">Read · Reflect · Respond</AppText>

      <View style={styles.card}>
        <AppText variant="heading">Today’s reading</AppText>
        <AppText>
          When you’ve done your RRR in your notebook, you’ll check in here. Coming in Phase 3.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
