import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Sheet } from '@/components/sheet';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { VERSIONS } from '@/lib/bible';

type VersionPickerProps = {
  visible: boolean;
  currentVersionId: string;
  onSelect: (versionId: string) => void;
  onClose: () => void;
};

/** Versions grouped by language: English, Tagalog, Cebuano, … */
export function VersionPicker({ visible, currentVersionId, onSelect, onClose }: VersionPickerProps) {
  const languages = [...new Set(VERSIONS.map((v) => v.language))];

  return (
    <Sheet visible={visible} onClose={onClose} title="Choose a version">
      <ScrollView contentContainerStyle={styles.list}>
        {languages.map((language) => (
          <View key={language} style={styles.group}>
            <AppText variant="caption">{language}</AppText>
            {VERSIONS.filter((v) => v.language === language).map((version) => {
              const isCurrent = version.id === currentVersionId;
              return (
                <Pressable
                  key={version.id}
                  style={styles.row}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isCurrent }}
                  onPress={() => {
                    onSelect(version.id);
                    onClose();
                  }}>
                  <AppText style={isCurrent ? styles.current : undefined}>
                    {version.name} ({version.shortName})
                  </AppText>
                  {isCurrent && <AppText style={styles.current}>✓</AppText>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.lg,
  },
  group: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  current: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
  },
});
