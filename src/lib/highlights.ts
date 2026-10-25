import { supabase } from '@/lib/supabase';

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** verse id (e.g. JHN.3.16) → colour */
export type ChapterHighlights = Record<string, HighlightColor>;

/** This person's highlights in one chapter. RLS only returns their own. */
export async function getChapterHighlights(
  userId: string,
  bookId: string,
  chapter: number,
): Promise<ChapterHighlights> {
  const { data, error } = await supabase
    .from('highlights')
    .select('verse_id, color')
    .eq('user_id', userId)
    .like('verse_id', `${bookId}.${chapter}.%`);
  if (error) {
    console.warn('Could not load highlights', error.message);
    return {};
  }
  return Object.fromEntries(data.map((h) => [h.verse_id, h.color as HighlightColor]));
}

/** Highlights a verse, or changes its colour if it's already highlighted. */
export async function setHighlight(userId: string, verseId: string, color: HighlightColor): Promise<boolean> {
  // upsert = insert, or update the existing row if (user_id, verse_id) already exists.
  const { error } = await supabase
    .from('highlights')
    .upsert({ user_id: userId, verse_id: verseId, color }, { onConflict: 'user_id,verse_id' });
  if (error) console.warn('Could not save highlight', error.message);
  return !error;
}

export async function removeHighlight(userId: string, verseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('highlights')
    .delete()
    .eq('user_id', userId)
    .eq('verse_id', verseId);
  if (error) console.warn('Could not remove highlight', error.message);
  return !error;
}
