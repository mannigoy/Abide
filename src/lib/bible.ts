import Storage from 'expo-sqlite/kv-store';

import { htmlToItems, type ChapterItem } from '@/lib/bible-html';
import { supabase } from '@/lib/supabase';

export { verseId, type ChapterItem } from '@/lib/bible-html';

/**
 * Bible text from the YouVersion Platform, through our `youversion` Edge
 * Function (the app key is a secret, so it lives on Supabase, not in the app).
 *
 * What we save on the phone: the list of versions and each version's books
 * and verse counts. No Scripture. Chapter text is only kept in memory while
 * the app is open, because the publishers' licences (e.g. NIV) don't let us
 * keep copies. We never store Bible text in our database either, only verse
 * references like JHN.3.16.
 */

export type BibleVersion = {
  /** YouVersion's Bible id, as a string, e.g. "111". */
  id: string;
  shortName: string;
  name: string;
  language: string;
};

/** Berean Standard Bible: public domain, so every app key can read it. */
export const DEFAULT_VERSION_ID = '3034';
export const DEFAULT_POSITION: BiblePosition = { bookId: 'JHN', chapter: 1 };

export type BiblePosition = { bookId: string; chapter: number };

export type Book = {
  id: string;
  name: string;
  numberOfChapters: number;
  /** verseCounts[0] is the number of verses in chapter 1, and so on. */
  verseCounts: number[];
};


export type Chapter = {
  versionId: string;
  bookId: string;
  bookName: string;
  chapter: number;
  items: ChapterItem[];
  previous: BiblePosition | null;
  next: BiblePosition | null;
  /** Shown under the text, as the publisher's licence requires. */
  attribution: { name: string; shortName: string; copyright: string; url: string };
};

/** Why loading failed, so the screen can say something helpful. */
export class BibleError extends Error {
  constructor(public reason: 'offline' | 'busy' | 'not_licensed' | 'other') {
    super(reason);
  }
}


// ---------------------------------------------------------------------------
// Talking to the Edge Function
// ---------------------------------------------------------------------------

type YouVersionRequest =
  | { action: 'bibles'; language: string }
  | { action: 'bible'; bibleId: string }
  | { action: 'index'; bibleId: string }
  | { action: 'chapter'; bibleId: string; chapterId: string };

async function callYouVersion<T>(request: YouVersionRequest): Promise<T> {
  // functions.invoke sends the signed-in user's token along automatically.
  const { data, error } = await supabase.functions.invoke('youversion', { body: request });
  if (!error) return data as T;
  const status = (error as { context?: Response }).context?.status;
  if (status === 429) throw new BibleError('busy');
  if (status === 403) throw new BibleError('not_licensed');
  if (status === undefined) throw new BibleError('offline');
  throw new BibleError('other');
}

// ---------------------------------------------------------------------------
// Saving on the phone (only lists and counts, never Scripture)
// ---------------------------------------------------------------------------

const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Returns the saved copy if it's recent; otherwise downloads a fresh one and
 * saves it. With no internet, an older saved copy is better than nothing.
 */
async function cached<T>(key: string, download: () => Promise<T>): Promise<T> {
  const saved = await Storage.getItem(key);
  const parsed = saved ? (JSON.parse(saved) as { savedAt: number; data: T }) : null;
  if (parsed && Date.now() - parsed.savedAt < REFRESH_AFTER_MS) return parsed.data;

  try {
    const data = await download();
    await Storage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    return data;
  } catch (error) {
    if (parsed) return parsed.data;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Versions, books and chapters
// ---------------------------------------------------------------------------

type ApiBible = {
  id: number;
  abbreviation: string;
  localized_abbreviation?: string;
  title: string;
  language_tag: string;
  copyright?: string | null;
  promotional_content?: string | null;
  youversion_deep_link?: string;
};

/** The languages we offer, in the order they're shown. YouVersion may tag Tagalog as tl or fil. */
const LANGUAGES = [
  { codes: ['en'], name: 'English' },
  { codes: ['tl', 'fil'], name: 'Tagalog' },
  { codes: ['ceb'], name: 'Cebuano' },
];

/** Every version our YouVersion app key is licensed to show, grouped by language. */
export function getVersions(): Promise<BibleVersion[]> {
  return cached('yv.versions', async () => {
    const versions: BibleVersion[] = [];
    for (const language of LANGUAGES) {
      for (const code of language.codes) {
        const result = await callYouVersion<{ data: ApiBible[] }>({ action: 'bibles', language: code });
        for (const bible of result.data) {
          if (versions.some((v) => v.id === String(bible.id))) continue;
          versions.push({
            id: String(bible.id),
            shortName: bible.localized_abbreviation || bible.abbreviation,
            name: bible.title,
            language: language.name,
          });
        }
      }
    }
    return versions;
  });
}

type VersionDetails = { name: string; shortName: string; copyright: string; url: string };

function getVersionDetails(versionId: string): Promise<VersionDetails> {
  return cached(`yv.version.${versionId}`, async () => {
    const bible = await callYouVersion<ApiBible>({ action: 'bible', bibleId: versionId });
    return {
      name: bible.title,
      shortName: bible.localized_abbreviation || bible.abbreviation,
      // Publishers sometimes wrap the line in quote marks.
      copyright: (bible.copyright?.trim() || bible.promotional_content?.trim() || '').replace(/^"|"$/g, ''),
      url: bible.youversion_deep_link ?? 'https://www.bible.com',
    };
  });
}

type ApiIndex = {
  books: {
    id: string;
    title: string;
    chapters: { id: number | string; verses: unknown[] }[];
  }[];
};

export function getBooks(versionId: string): Promise<Book[]> {
  return cached(`yv.books.${versionId}`, async () => {
    const index = await callYouVersion<ApiIndex>({ action: 'index', bibleId: versionId });
    return index.books.map((book) => {
      // Skip book introductions; keep numbered chapters only.
      const chapters = book.chapters.filter((c) => /^\d+$/.test(String(c.id)));
      return {
        id: book.id,
        name: book.title,
        numberOfChapters: chapters.length,
        verseCounts: chapters.map((c) => c.verses.length),
      };
    });
  });
}

// Chapters are kept in memory only, so they're gone when the app closes.
const chapterMemory = new Map<string, Chapter>();

export async function getChapter(versionId: string, position: BiblePosition): Promise<Chapter> {
  const { bookId, chapter } = position;
  const key = `${versionId}.${bookId}.${chapter}`;
  const remembered = chapterMemory.get(key);
  if (remembered) return remembered;

  const [books, details, passage] = await Promise.all([
    getBooks(versionId),
    getVersionDetails(versionId),
    callYouVersion<{ content: string }>({
      action: 'chapter',
      bibleId: versionId,
      chapterId: `${bookId}.${chapter}`,
    }),
  ]);

  const bookIndex = books.findIndex((b) => b.id === bookId);
  const book = books[bookIndex];
  const result: Chapter = {
    versionId,
    bookId,
    bookName: book?.name ?? bookId,
    chapter,
    items: htmlToItems(bookId, chapter, passage.content),
    previous: neighbour(books, bookIndex, chapter, -1),
    next: neighbour(books, bookIndex, chapter, 1),
    attribution: details,
  };
  chapterMemory.set(key, result);
  return result;
}

/** The chapter before (-1) or after (+1), crossing into the next book if needed. */
function neighbour(books: Book[], bookIndex: number, chapter: number, step: -1 | 1): BiblePosition | null {
  const book = books[bookIndex];
  if (!book) return null;
  const target = chapter + step;
  if (target >= 1 && target <= book.numberOfChapters) return { bookId: book.id, chapter: target };
  const other = books[bookIndex + step];
  if (!other) return null;
  return { bookId: other.id, chapter: step === 1 ? 1 : other.numberOfChapters };
}

// ---------------------------------------------------------------------------
// Remembering the reader's place and version on this phone
// ---------------------------------------------------------------------------

export async function loadReaderState(): Promise<{ versionId: string; position: BiblePosition }> {
  const saved = await Storage.getItem('bible.reader');
  if (saved) {
    const parsed = JSON.parse(saved) as { versionId: string; position: BiblePosition };
    // Older app versions saved ids like "BSB" from the previous Bible service.
    if (/^\d+$/.test(parsed.versionId)) return parsed;
    return { versionId: DEFAULT_VERSION_ID, position: parsed.position };
  }
  return { versionId: DEFAULT_VERSION_ID, position: DEFAULT_POSITION };
}

export function saveReaderState(versionId: string, position: BiblePosition) {
  return Storage.setItem('bible.reader', JSON.stringify({ versionId, position }));
}
