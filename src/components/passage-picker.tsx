import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BookPicker, type VerseRange } from '@/components/bible/book-picker';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DEFAULT_VERSION_ID } from '@/lib/bible';

/** "John 3", "John 3:16" or "John 3:16–21". */
function formatPassage(bookName: string, chapter: number, verses?: VerseRange) {
  if (!verses) return `${bookName} ${chapter}`;
  if (verses.start === verses.end) return `${bookName} ${chapter}:${verses.start}`;
  return `${bookName} ${chapter}:${verses.start}–${verses.end}`;
}

type PassagePickerProps = {
  label: string;
  /** The chosen passage, e.g. "John 3", or '' when nothing is chosen yet. */
  value: string;
  onChange: (passage: string) => void;
  /** Shows a "Clear" link so an optional passage can be removed again. */
  optional?: boolean;
};

/**
 * A dropdown-style field: tapping it opens the book and chapter picker.
 * Book names always come from the English BSB list, so every check-in reads
 * the same way (e.g. "John 3") whatever version the leader reads.
 */
export function PassagePicker({ label, value, onChange, optional }: PassagePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <AppText variant="caption">{label}</AppText>
      <Pressable
        style={styles.box}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${value}. Tap to change` : `${label}: choose a passage`}>
        <AppText style={value ? undefined : styles.placeholder}>
          {value || 'Choose a book and chapter'}
        </AppText>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
          size={22}
          tintColor={Colors.textSecondary}
        />
      </Pressable>
      {optional && value !== '' && (
        <Pressable onPress={() => onChange('')} hitSlop={8} style={styles.clear}>
          <AppText variant="caption" style={styles.clearText}>
            Clear
          </AppText>
        </Pressable>
      )}

      <BookPicker
        visible={open}
        versionId={DEFAULT_VERSION_ID}
        onSelect={(position, book, verses) => onChange(formatPassage(book.name, position.chapter, verses))}
        onClose={() => setOpen(false)}
        withVerses
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  box: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
  },
  placeholder: {
    color: Colors.textSecondary,
  },
  clear: {
    alignSelf: 'flex-start',
  },
  clearText: {
    color: Colors.primary,
  },
});
