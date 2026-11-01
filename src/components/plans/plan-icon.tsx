import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Colors, TileColors } from '@/constants/theme';
import type { Plan } from '@/lib/plans';

type AndroidSymbol = Extract<SymbolViewProps['name'], { android?: unknown }>['android'];

type PlanIconProps = {
  plan: Plan;
  size: number;
  /** White tile, for sitting on the green "My plan" card. */
  onDark?: boolean;
};

/** A plan's icon on a rounded, softly coloured square. */
export function PlanIcon({ plan, size, onDark }: PlanIconProps) {
  const icon = plan.icon as AndroidSymbol;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: onDark ? Colors.surface : TileColors[plan.tileColor] },
      ]}>
      <SymbolView
        name={{ android: icon, web: icon, ios: 'book' }}
        size={Math.round(size * 0.45)}
        tintColor={Colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
