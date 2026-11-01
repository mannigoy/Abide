import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';

type FilterChipsProps = {
  options: string[];
  /** The selected option, or null for "All". */
  value: string | null;
  onChange: (value: string | null) => void;
};

/** A row of filter chips, starting with "All". Scrolls sideways if there are many. */
export function FilterChips({ options, value, onChange }: FilterChipsProps) {
  const chips: { label: string; value: string | null }[] = [
    { label: 'All', value: null },
    ...options.map((option) => ({ label: option, value: option })),
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const selected = chip.value === value;
        return (
          <Pressable
            key={chip.label}
            style={[styles.chip, selected && styles.selected]}
            onPress={() => onChange(chip.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selected: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  selectedLabel: {
    color: Colors.surface,
  },
});
