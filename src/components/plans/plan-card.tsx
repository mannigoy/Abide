import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanIcon } from '@/components/plans/plan-icon';
import { Colors, Fonts } from '@/constants/theme';
import type { Plan } from '@/lib/plans';

type PlanCardProps = {
  plan: Plan;
  onPress: () => void;
};

/** One plan in the "Find a plan" list. */
export function PlanCard({ plan, onPress }: PlanCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button">
      <PlanIcon plan={plan} size={56} />
      <View style={styles.text}>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {plan.durationDays} days · {plan.tagline}
        </Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={Colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
});
