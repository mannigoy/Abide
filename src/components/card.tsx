import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type CardProps = {
  children: ReactNode;
  /** Adds an amber stripe on the left, for the main thing on a screen. */
  highlight?: boolean;
};

/** A white rounded box that sits on the cream background. */
export function Card({ children, highlight }: CardProps) {
  return <View style={[styles.card, highlight && styles.highlight]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  highlight: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
});
