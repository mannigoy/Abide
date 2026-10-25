import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, HighlightColors, Spacing } from '@/constants/theme';
import type { ChapterItem } from '@/lib/bible';
import type { ChapterHighlights } from '@/lib/highlights';

type Verse = Extract<ChapterItem, { type: 'verse' }>;

type ChapterTextProps = {
  items: ChapterItem[];
  highlights: ChapterHighlights;
  selectedVerseId: string | null;
  onVersePress: (verse: Verse) => void;
};

/** Headings, then flowing paragraphs of verses. Tap a verse to highlight it. */
export function ChapterText({ items, highlights, selectedVerseId, onVersePress }: ChapterTextProps) {
  // Group verses into sections: a new section starts at each heading.
  const sections: { heading?: string; verses: Verse[] }[] = [{ verses: [] }];
  for (const item of items) {
    if (item.type === 'heading') {
      sections.push({ heading: item.text, verses: [] });
    } else {
      sections[sections.length - 1].verses.push(item);
    }
  }

  return (
    <View style={styles.container}>
      {sections
        .filter((section) => section.heading || section.verses.length > 0)
        .map((section, i) => (
          <View key={i} style={styles.section}>
            {section.heading && <Text style={styles.heading}>{section.heading}</Text>}
            {/* Text inside Text flows like a paragraph, and each inner Text can be tapped. */}
            <Text style={styles.body}>
              {section.verses.map((verse) => {
                const color = highlights[verse.verseId];
                return (
                  <Text
                    key={verse.verseId}
                    onPress={() => onVersePress(verse)}
                    style={[
                      color && { backgroundColor: HighlightColors[color] },
                      selectedVerseId === verse.verseId && styles.selected,
                    ]}>
                    <Text style={styles.verseNumber}>{verse.number} </Text>
                    {verse.text}{' '}
                  </Text>
                );
              })}
            </Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  heading: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    lineHeight: 24,
    color: Colors.text,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 18,
    lineHeight: 30,
    color: Colors.text,
  },
  verseNumber: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  selected: {
    textDecorationLine: 'underline',
    textDecorationColor: Colors.primary,
  },
});
