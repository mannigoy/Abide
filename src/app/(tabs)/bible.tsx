import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BookPicker } from '@/components/bible/book-picker';
import { ChapterText } from '@/components/bible/chapter-text';
import { HighlightSheet } from '@/components/bible/highlight-sheet';
import { VersionPicker } from '@/components/bible/version-picker';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  getChapter,
  loadReaderState,
  saveReaderState,
  VERSIONS,
  type BiblePosition,
  type Chapter,
  type ChapterItem,
} from '@/lib/bible';
import {
  getChapterHighlights,
  removeHighlight,
  setHighlight,
  type ChapterHighlights,
  type HighlightColor,
} from '@/lib/highlights';
import { useSession } from '@/lib/session';

type Verse = Extract<ChapterItem, { type: 'verse' }>;

export default function BibleScreen() {
  const { profile } = useSession();
  const userId = profile?.id;

  // Where the reader is. null until the saved place has been loaded.
  const [reader, setReader] = useState<{ versionId: string; position: BiblePosition } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // Remember which chapter was loaded, so a different one counts as "still loading".
  const [loaded, setLoaded] = useState<{ key: string; chapter: Chapter | null } | null>(null);
  const [highlights, setHighlights] = useState<ChapterHighlights>({});
  const [picker, setPicker] = useState<'book' | 'version' | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);

  // Open where you left off last time.
  useEffect(() => {
    loadReaderState().then(setReader);
  }, []);

  // Load the chapter (from the phone if saved, otherwise from the internet)
  // whenever the version or place changes.
  const chapterKey = reader
    ? `${reader.versionId}.${reader.position.bookId}.${reader.position.chapter}.${retryCount}`
    : null;
  useEffect(() => {
    if (!reader || !chapterKey) return;
    let ignore = false;
    getChapter(reader.versionId, reader.position)
      .then((result) => {
        if (!ignore) setLoaded({ key: chapterKey, chapter: result });
      })
      .catch(() => {
        if (!ignore) setLoaded({ key: chapterKey, chapter: null });
      });
    return () => {
      ignore = true;
    };
  }, [reader, chapterKey]);
  // undefined = loading, null = failed
  const chapter = loaded && loaded.key === chapterKey ? loaded.chapter : undefined;

  // Highlights belong to verses, not versions, so they only reload when the place changes.
  const bookId = reader?.position.bookId;
  const chapterNumber = reader?.position.chapter;
  useEffect(() => {
    if (!userId || !bookId || !chapterNumber) return;
    let ignore = false;
    getChapterHighlights(userId, bookId, chapterNumber).then((result) => {
      if (!ignore) setHighlights(result);
    });
    return () => {
      ignore = true;
    };
  }, [userId, bookId, chapterNumber]);

  function goTo(versionId: string, position: BiblePosition) {
    setReader({ versionId, position });
    saveReaderState(versionId, position);
  }

  async function pickColor(color: HighlightColor) {
    if (!userId || !selectedVerse) return;
    const verseId = selectedVerse.verseId;
    const previous = highlights;
    // Show the colour straight away; undo it if saving fails.
    setHighlights({ ...highlights, [verseId]: color });
    setSelectedVerse(null);
    if (!(await setHighlight(userId, verseId, color))) setHighlights(previous);
  }

  async function clearColor() {
    if (!userId || !selectedVerse) return;
    const verseId = selectedVerse.verseId;
    const previous = highlights;
    const { [verseId]: _removed, ...rest } = highlights;
    setHighlights(rest);
    setSelectedVerse(null);
    if (!(await removeHighlight(userId, verseId))) setHighlights(previous);
  }

  if (!reader) return null;
  const version = VERSIONS.find((v) => v.id === reader.versionId);
  const placeLabel = chapter ? `${chapter.bookName} ${chapter.chapter}` : 'Choose a book';

  return (
    <>
      {/* The key makes the screen start again at the top when the chapter changes. */}
      <Screen key={`${reader.versionId}.${reader.position.bookId}.${reader.position.chapter}`}>
        <View style={styles.toolbar}>
          <Pressable style={[styles.chip, styles.placeChip]} onPress={() => setPicker('book')}>
            <AppText style={styles.chipText}>{placeLabel} ▾</AppText>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => setPicker('version')}>
            <AppText style={styles.chipText}>{version?.shortName ?? reader.versionId} ▾</AppText>
          </Pressable>
        </View>

        {chapter === undefined && <AppText variant="caption">Loading…</AppText>}

        {chapter === null && (
          <>
            <AppText variant="caption">
              Couldn’t load this chapter. Check your internet connection.
            </AppText>
            <Button title="Try again" variant="secondary" onPress={() => setRetryCount((n) => n + 1)} />
          </>
        )}

        {chapter && (
          <>
            <AppText variant="title">{placeLabel}</AppText>
            <ChapterText
              items={chapter.items}
              highlights={highlights}
              selectedVerseId={selectedVerse?.verseId ?? null}
              onVersePress={setSelectedVerse}
            />

            <View style={styles.nav}>
              {chapter.previous ? (
                <View style={styles.navButton}>
                  <Button
                    title="← Previous"
                    variant="secondary"
                    onPress={() => goTo(reader.versionId, chapter.previous!)}
                  />
                </View>
              ) : (
                <View style={styles.navButton} />
              )}
              {chapter.next ? (
                <View style={styles.navButton}>
                  <Button
                    title="Next →"
                    variant="secondary"
                    onPress={() => goTo(reader.versionId, chapter.next!)}
                  />
                </View>
              ) : (
                <View style={styles.navButton} />
              )}
            </View>

            {/* Copyright: shown wherever Scripture is displayed. */}
            <View style={styles.attribution}>
              <AppText variant="caption">
                {chapter.attribution.name} ({chapter.attribution.shortName}).{' '}
                {chapter.attribution.publicDomain ? 'Public domain.' : 'Used under its free licence.'}
              </AppText>
              <Pressable onPress={() => Linking.openURL(chapter.attribution.licenseUrl)}>
                <AppText variant="caption" style={styles.link}>
                  Copyright and licence details
                </AppText>
              </Pressable>
              <Pressable onPress={() => Linking.openURL('https://bible.helloao.org')}>
                <AppText variant="caption" style={styles.link}>
                  Text from the Free Use Bible API
                </AppText>
              </Pressable>
            </View>
          </>
        )}
      </Screen>

      <BookPicker
        visible={picker === 'book'}
        versionId={reader.versionId}
        onSelect={(position) => goTo(reader.versionId, position)}
        onClose={() => setPicker(null)}
      />
      <VersionPicker
        visible={picker === 'version'}
        currentVersionId={reader.versionId}
        onSelect={(versionId) => goTo(versionId, reader.position)}
        onClose={() => setPicker(null)}
      />
      <HighlightSheet
        reference={
          selectedVerse && chapter ? `${chapter.bookName} ${chapter.chapter}:${selectedVerse.number}` : null
        }
        currentColor={selectedVerse ? highlights[selectedVerse.verseId] : undefined}
        onPick={pickColor}
        onRemove={clearColor}
        onClose={() => setSelectedVerse(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeChip: {
    flexShrink: 1,
  },
  chipText: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  nav: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  navButton: {
    flex: 1,
  },
  attribution: {
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  link: {
    color: Colors.primary,
  },
});
