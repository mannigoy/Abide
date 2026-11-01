import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getBooks, type BiblePosition, type Book } from '@/lib/bible';

/** A verse range inside one chapter. start === end means a single verse. */
export type VerseRange = { start: number; end: number };

type BookPickerProps = {
  visible: boolean;
  versionId: string;
  /** `verses` is only given when `withVerses` is on and the leader picked verses. */
  onSelect: (position: BiblePosition, book: Book, verses?: VerseRange) => void;
  onClose: () => void;
  /** Adds a third step after the chapter to pick a verse or a range of verses. */
  withVerses?: boolean;
};

/** Pick a book, then a chapter, then (optionally) verses. */
export function BookPicker({ visible, versionId, onSelect, onClose, withVerses }: BookPickerProps) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState(false);
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [range, setRange] = useState<VerseRange | null>(null);

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
    setChapter(null);
    setRange(null);
    onClose();
  }

  function choose(position: BiblePosition, chosenBook: Book, verses?: VerseRange) {
    onSelect(position, chosenBook, verses);
    close();
  }

  function handleChapter(chosenBook: Book, number: number) {
    if (!withVerses) {
      choose({ bookId: chosenBook.id, chapter: number }, chosenBook);
      return;
    }
    setChapter(number);
    setRange(null);
  }

  /**
   * First tap picks one verse. A second tap stretches it into a range.
   * Tapping again after that starts a new selection.
   */
  function handleVerse(verse: number) {
    if (!range || range.start !== range.end) {
      setRange({ start: verse, end: verse });
    } else if (verse >= range.start) {
      setRange({ start: range.start, end: verse });
    } else {
      setRange({ start: verse, end: range.start });
    }
  }

  // The book list already knows how many verses each chapter has.
  const verseCount = book && chapter !== null ? (book.verseCounts[chapter - 1] ?? 0) : 0;
  const title = !book ? 'Choose a book' : chapter ? `${book.name} ${chapter}` : book.name;

  return (
    <Sheet visible={visible} onClose={close} title={title}>
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

      {book && chapter === null && (
        <ScrollView contentContainerStyle={styles.grid}>
          {Array.from({ length: book.numberOfChapters }, (_, i) => i + 1).map((number) => (
            <Pressable
              key={number}
              style={styles.cell}
              accessibilityLabel={`${book.name} chapter ${number}`}
              onPress={() => handleChapter(book, number)}>
              <AppText style={styles.cellNumber}>{number}</AppText>
            </Pressable>
          ))}
          <View style={styles.backRow}>
            <Pressable onPress={() => setBook(null)}>
              <AppText style={styles.back}>← All books</AppText>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {book && chapter !== null && (
        <>
          <AppText variant="caption">
            {range
              ? range.start === range.end
                ? `Verse ${range.start}. Tap another verse to make a range.`
                : `Verses ${range.start}–${range.end}`
              : 'Tap the first verse, then the last verse.'}
          </AppText>
          <ScrollView contentContainerStyle={styles.grid}>
            {Array.from({ length: verseCount }, (_, i) => i + 1).map((verse) => {
              const selected = range !== null && verse >= range.start && verse <= range.end;
              return (
                <Pressable
                  key={verse}
                  style={[styles.cell, selected && styles.cellSelected]}
                  accessibilityLabel={`Verse ${verse}`}
                  accessibilityState={{ selected }}
                  onPress={() => handleVerse(verse)}>
                  <AppText style={[styles.cellNumber, selected && styles.cellNumberSelected]}>{verse}</AppText>
                </Pressable>
              );
            })}
            <View style={styles.backRow}>
              <Pressable onPress={() => setChapter(null)}>
                <AppText style={styles.back}>← All chapters</AppText>
              </Pressable>
            </View>
          </ScrollView>
          <Button
            title="Done"
            disabled={!range}
            onPress={() => range && choose({ bookId: book.id, chapter }, book, range)}
          />
          <Button
            title="Whole chapter"
            variant="secondary"
            onPress={() => choose({ bookId: book.id, chapter }, book)}
          />
        </>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cell: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cellNumber: {
    fontFamily: Fonts.semiBold,
  },
  cellNumberSelected: {
    color: Colors.surface,
  },
  backRow: {
    width: '100%',
    paddingVertical: Spacing.md,
  },
  back: {
    color: Colors.primary,
  },
});
