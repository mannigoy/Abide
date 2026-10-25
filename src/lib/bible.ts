import Storage from 'expo-sqlite/kv-store';

/**
 * Bible text from the Free Use Bible API (https://bible.helloao.org): free,
 * no API key, no request limit. Text is only ever saved on the phone, never
 * in our database (we store verse references like JHN.3.16, not text).
 */
const API = 'https://bible.helloao.org/api';

export type BibleVersion = {
  /** The API's translation id. */
  id: string;
  shortName: string;
  name: string;
  language: string;
};

/** The versions offered in the app. Any translation id from the API can be added here. */
export const VERSIONS: BibleVersion[] = [
  { id: 'BSB', shortName: 'BSB', name: 'Berean Standard Bible', language: 'English' },
  { id: 'ENGWEBP', shortName: 'WEB', name: 'World English Bible', language: 'English' },
  { id: 'eng_kjv', shortName: 'KJV', name: 'King James Version', language: 'English' },
  { id: 'tgl_ulb', shortName: 'ULB', name: 'Tagalog Bible', language: 'Tagalog' },
  { id: 'ceb_ocb', shortName: 'OCB', name: 'Ang Pulong sa Dios', language: 'Cebuano' },
  { id: 'ceb_ulb', shortName: 'ULB', name: 'Cebuano Bible', language: 'Cebuano' },
  // TODO(you): add Hiligaynon. Its id in the API is 'hil_bib' and its name is
  // 'Ang Pulong Sang Dios'. Then check it appears in the version picker.
];

export const DEFAULT_VERSION_ID = 'BSB';
export const DEFAULT_POSITION: BiblePosition = { bookId: 'JHN', chapter: 1 };

export type BiblePosition = { bookId: string; chapter: number };

export type Book = { id: string; name: string; numberOfChapters: number };

export type ChapterItem =
  | { type: 'heading'; text: string }
  | { type: 'verse'; number: number; verseId: string; text: string };

export type Chapter = {
  versionId: string;
  bookId: string;
  bookName: string;
  chapter: number;
  items: ChapterItem[];
  previous: BiblePosition | null;
  next: BiblePosition | null;
  /** Shown under the text: who the translation belongs to and its licence. */
  attribution: { name: string; shortName: string; publicDomain: boolean; licenseUrl: string };
};

/** A verse's id is the same in every translation, e.g. JHN.3.16. */
export function verseId(bookId: string, chapter: number, verse: number) {
  return `${bookId}.${chapter}.${verse}`;
}

// ---------------------------------------------------------------------------
// Loading, with a copy saved on the phone
// ---------------------------------------------------------------------------

const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`Bible API ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

export function getBooks(versionId: string): Promise<Book[]> {
  return cached(`bible.books.${versionId}`, async () => {
    const data = await getJson<{ books: { id: string; name: string; numberOfChapters: number }[] }>(
      `/${versionId}/books.json`,
    );
    return data.books.map(({ id, name, numberOfChapters }) => ({ id, name, numberOfChapters }));
  });
}

export function getChapter(versionId: string, position: BiblePosition): Promise<Chapter> {
  const { bookId, chapter } = position;
  return cached(`bible.chapter.${versionId}.${bookId}.${chapter}`, async () => {
    const data = await getJson<ApiChapterResponse>(`/${versionId}/${bookId}/${chapter}.json`);
    return {
      versionId,
      bookId,
      bookName: data.book.name,
      chapter: data.chapter.number,
      items: toItems(bookId, chapter, data.chapter.content),
      previous: toPosition(data.previousChapterReference),
      next: toPosition(data.nextChapterReference),
      attribution: {
        name: data.translation.name,
        shortName: data.translation.shortName,
        publicDomain: data.translation.license?.publicDomain ?? false,
        licenseUrl: data.translation.licenseUrl,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Turning the API's format into something simple to show
// ---------------------------------------------------------------------------

type ApiInline =
  | string
  | { text: string }
  | { heading: string }
  | { lineBreak: true }
  | { noteId: number };

type ApiContent =
  | { type: 'heading'; content: string[] }
  | { type: 'verse'; number: number; content: ApiInline[] }
  | { type: 'line_break' }
  | { type: 'hebrew_subtitle'; content: ApiInline[] };

type ApiReference = { book: string; chapter: number } | null | undefined;

type ApiChapterResponse = {
  translation: {
    name: string;
    shortName: string;
    licenseUrl: string;
    license?: { publicDomain?: boolean };
  };
  book: { name: string };
  chapter: { number: number; content: ApiContent[] };
  previousChapterReference: ApiReference;
  nextChapterReference: ApiReference;
};

function inlineText(parts: ApiInline[]): string {
  return parts
    .map((part) => {
      if (typeof part === 'string') return part;
      if ('text' in part) return part.text;
      if ('heading' in part) return part.heading;
      return ''; // footnote markers and line breaks are left out
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toItems(bookId: string, chapter: number, content: ApiContent[]): ChapterItem[] {
  const items: ChapterItem[] = [];
  for (const block of content) {
    if (block.type === 'heading') {
      items.push({ type: 'heading', text: block.content.join(' ') });
    } else if (block.type === 'hebrew_subtitle') {
      // e.g. "A Psalm of David" at the top of a psalm
      items.push({ type: 'heading', text: inlineText(block.content) });
    } else if (block.type === 'verse') {
      items.push({
        type: 'verse',
        number: block.number,
        verseId: verseId(bookId, chapter, block.number),
        text: inlineText(block.content),
      });
    }
  }
  return items;
}

function toPosition(ref: ApiReference): BiblePosition | null {
  return ref ? { bookId: ref.book, chapter: ref.chapter } : null;
}

// ---------------------------------------------------------------------------
// Remembering the reader's place and version on this phone
// ---------------------------------------------------------------------------

export async function loadReaderState(): Promise<{ versionId: string; position: BiblePosition }> {
  const saved = await Storage.getItem('bible.reader');
  if (saved) {
    const parsed = JSON.parse(saved) as { versionId: string; position: BiblePosition };
    if (VERSIONS.some((v) => v.id === parsed.versionId)) return parsed;
  }
  return { versionId: DEFAULT_VERSION_ID, position: DEFAULT_POSITION };
}

export function saveReaderState(versionId: string, position: BiblePosition) {
  return Storage.setItem('bible.reader', JSON.stringify({ versionId, position }));
}
