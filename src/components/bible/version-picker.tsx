import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Sheet } from '@/components/sheet';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getVersions, type BibleVersion } from '@/lib/bible';

type VersionPickerProps = {
  visible: boolean;
  currentVersionId: string;
  onSelect: (versionId: string) => void;
  onClose: () => void;
};

/** Versions grouped by language: English, Tagalog, Cebuano, … */
export function VersionPicker({ visible, currentVersionId, onSelect, onClose }: VersionPickerProps) {
  // undefined = loading, null = failed
  const [versions, setVersions] = useState<BibleVersion[] | null | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    let ignore = false;
    getVersions()
      .then((result) => {
        if (!ignore) setVersions(result);
      })
      .catch(() => {
        if (!ignore) setVersions(null);
      });
    return () => {
      ignore = true;
    };
  }, [visible]);

  const languages = [...new Set((versions ?? []).map((v) => v.language))];

  return (
    <Sheet visible={visible} onClose={onClose} title="Choose a version">
      {versions === undefined && <AppText variant="caption">Loading versions…</AppText>}
      {versions === null && (
        <AppText variant="caption">Couldn’t load the versions. Check your internet connection.</AppText>
      )}
      <ScrollView contentContainerStyle={styles.list}>
        {languages.map((language) => (
          <View key={language} style={styles.group}>
            <AppText variant="caption">{language}</AppText>
            {(versions ?? []).filter((v) => v.language === language).map((version) => {
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
