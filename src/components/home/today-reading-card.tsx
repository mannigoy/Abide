import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, TileColors } from '@/constants/theme';

type TodayReadingCardProps = {
  /** e.g. "John · Day 13" when today's reading comes from a plan. */
  badge?: string;
  /** The big line, e.g. "John 3:1–21". */
  title: string;
  description: string;
  /** The button or form at the bottom. */
  children?: ReactNode;
};

/** The white "Today's reading" card on Home. */
export function TodayReadingCard({ badge, title, description, children }: TodayReadingCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>TODAY’S READING</Text>
        {badge && <Text style={styles.badge}>{badge}</Text>}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: Colors.textSecondary,
  },
  badge: {
    flexShrink: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: TileColors.green,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.text,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
