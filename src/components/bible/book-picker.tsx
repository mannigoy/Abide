import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Sheet } from '@/components/sheet';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getBooks, type BiblePosition, type Book } from '@/lib/bible';

type BookPickerProps = {
  visible: boolean;
  versionId: string;
  onSelect: (position: BiblePosition) => void;
  onClose: () => void;
};

/** Pick a book, then a chapter. */
export function BookPicker({ visible, versionId, onSelect, onClose }: BookPickerProps) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState(false);
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    if (!visible) return;
    let ignore = false;
    getBooks(versionId)
      .then((result) => {
        if (!ignore) setBooks(result);
      })
      .catch(() => {
        if (!ignore) setError(true);
      });
    return () => {
      ignore = true;
    };
  }, [visible, versionId]);

  function close() {
    setBook(null);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={close} title={book ? book.name : 'Choose a book'}>
      {error && !books && (
        <AppText variant="caption">Couldn’t load the books. Check your internet connection.</AppText>
      )}

      {!book && books && (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <Pressable style={styles.bookRow} onPress={() => setBook(item)}>
              <AppText>{item.name}</AppText>
            </Pressable>
          )}
        />
      )}

      {book && (
        <ScrollView contentContainerStyle={styles.chapterGrid}>
          {Array.from({ length: book.numberOfChapters }, (_, i) => i + 1).map((chapter) => (
            <Pressable
              key={chapter}
              style={styles.chapterCell}
              accessibilityLabel={`${book.name} chapter ${chapter}`}
              onPress={() => {
                onSelect({ bookId: book.id, chapter });
                close();
              }}>
              <AppText style={styles.chapterNumber}>{chapter}</AppText>
            </Pressable>
          ))}
          <View style={styles.backRow}>
            <Pressable onPress={() => setBook(null)}>
              <AppText style={styles.back}>← All books</AppText>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bookRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chapterCell: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumber: {
    fontFamily: Fonts.semiBold,
  },
  backRow: {
    width: '100%',
    paddingVertical: Spacing.md,
  },
  back: {
    color: Colors.primary,
  },
});
