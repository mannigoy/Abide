import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Colors, HighlightColors, Spacing } from '@/constants/theme';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/lib/highlights';

type HighlightSheetProps = {
  /** e.g. "John 3:16"; the sheet is hidden when this is null. */
  reference: string | null;
  currentColor: HighlightColor | undefined;
  onPick: (color: HighlightColor) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function HighlightSheet({ reference, currentColor, onPick, onRemove, onClose }: HighlightSheetProps) {
  return (
    <Sheet visible={reference !== null} onClose={onClose} title={reference ?? ''}>
      <View style={styles.colors}>
        {HIGHLIGHT_COLORS.map((color) => (
          <Pressable
            key={color}
            onPress={() => onPick(color)}
            accessibilityRole="button"
            accessibilityLabel={`Highlight ${color}`}
            accessibilityState={{ selected: currentColor === color }}
            style={[
              styles.swatch,
              { backgroundColor: HighlightColors[color] },
              currentColor === color && styles.swatchSelected,
            ]}
          />
        ))}
      </View>
      {currentColor && <Button title="Remove highlight" variant="secondary" onPress={onRemove} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  colors: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
});
