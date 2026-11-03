import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ChapterText } from '@/components/bible/chapter-text';
import { Sheet } from '@/components/sheet';
import { Colors, Spacing } from '@/constants/theme';
import { getChapter, loadReaderState, type Chapter, type ChapterItem } from '@/lib/bible';
import type { PlanReading } from '@/lib/plans';

type PassageSheetProps = {
  visible: boolean;
  /** e.g. Mark 1:40-45 and Mark 2:1-12 */
  readings: PlanReading[];
  title: string;
  onClose: () => void;
};

type Loaded = { reading: PlanReading; items: ChapterItem[]; attribution: Chapter['attribution'] };

/**
 * Shows a plan day's passage in a bottom sheet, in the version the leader
 * last used in the Bible tab. Only the verses in the reading are shown.
 */
export function PassageSheet({ visible, readings, title, onClose }: PassageSheetProps) {
  // Remember which passage was loaded, so opening a different one counts as "loading".
  const [loaded, setLoaded] = useState<{ key: string; result: Loaded[] | null } | null>(null);
  const key = readings.map((r) => r.reference).join(';');

  useEffect(() => {
    if (!visible) return;
    let ignore = false;
    loadReaderState()
      .then(({ versionId }) =>
        Promise.all(readings.map((reading) => getChapter(versionId, { bookId: reading.bookId, chapter: reading.chapter }))),
      )
      .then((chapters) => {
        const result = chapters.map((chapter, i) => ({
          reading: readings[i],
          items: onlyVersesIn(chapter.items, readings[i]),
          attribution: chapter.attribution,
        }));
        if (!ignore) setLoaded({ key, result });
      })
      .catch(() => {
        if (!ignore) setLoaded({ key, result: null });
      });
    return () => {
      ignore = true;
    };
  }, [visible, key, readings]);

  const result = loaded?.key === key ? loaded.result : undefined;

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {result === undefined && <AppText variant="caption">Loading…</AppText>}
      {result === null && (
        <AppText variant="caption">Couldn’t load the passage. Check your internet connection.</AppText>
      )}
      {result && (
        <ScrollView contentContainerStyle={styles.content}>
          {result.map(({ reading, items }) => (
            <View key={reading.reference} style={styles.reading}>
              {result.length > 1 && <AppText variant="heading">{reading.reference}</AppText>}
              <ChapterText items={items} highlights={{}} selectedVerseId={null} onVersePress={() => {}} />
            </View>
          ))}
          {/* Copyright: shown wherever Scripture is displayed. */}
          <View style={styles.attribution}>
            <AppText variant="caption">
              {result[0].attribution.name} ({result[0].attribution.shortName})
            </AppText>
            {result[0].attribution.copyright !== '' && (
              <AppText variant="caption">{result[0].attribution.copyright}</AppText>
            )}
            <AppText variant="caption">Bible text provided by YouVersion</AppText>
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
}

/** Keeps the verses in the reading's range, and any heading right before one of them. */
function onlyVersesIn(items: ChapterItem[], reading: PlanReading): ChapterItem[] {
  if (!reading.startVerse) return items; // whole chapter
  const start = reading.startVerse;
  const end = reading.endVerse ?? start;
  const inRange = (item: ChapterItem | undefined) =>
    item?.type === 'verse' && item.number >= start && item.number <= end;
  return items.filter((item, i) => (item.type === 'heading' ? inRange(items[i + 1]) : inRange(item)));
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  reading: {
    gap: Spacing.sm,
  },
  attribution: {
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
