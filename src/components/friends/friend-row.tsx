import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, TileColors } from '@/constants/theme';

type FriendRowProps = {
  name: string;
  detail: string;
  /** Highlights the detail line, e.g. "✓ Read today". */
  good?: boolean;
  onPress?: () => void;
  /** Buttons on the right, e.g. Accept / Decline. */
  actions?: ReactNode;
};

/** A person in the Friends tab: their initial, name and one line about them. */
export function FriendRow({ name, detail, good, onPress, actions }: FriendRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{name.trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.detail, good && styles.detailGood]}>{detail}</Text>
      </View>
      {actions}
      {onPress && !actions && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TileColors.green,
  },
  initial: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.primary,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  detail: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailGood: {
    fontFamily: Fonts.medium,
    color: Colors.primary,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
});
