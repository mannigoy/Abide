/**
 * Turns a chapter's HTML from YouVersion into a simple list of headings and
 * verses. It looks like:
 *
 *   <div class="s1 yv-h">Jesus Teaches Nicodemus</div>
 *   <div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Now there was…
 *
 * `yv-v` marks where a verse starts, `yv-vlbl` is its printed number (we draw
 * our own), and `yv-h` is a section heading. A verse can run on into the next
 * paragraph, so its text keeps collecting until the next `yv-v`.
 */

export type ChapterItem =
  | { type: 'heading'; text: string }
  | {
      type: 'verse';
      number: number;
      /** Set when a version joins verses into one, e.g. 32–33. */
      endNumber?: number;
      verseId: string;
      text: string;
    };

/** A verse's id is the same in every translation, e.g. JHN.3.16. */
export function verseId(bookId: string, chapter: number, verse: number) {
  return `${bookId}.${chapter}.${verse}`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Which verse a tag starts, from v="16" (or data-usfm="JHN.3.16" as a fallback).
 * Joined verses also have ev="33" for the last one.
 */
function verseNumberOf(tag: string): { number: number; endNumber?: number } | null {
  const v = /\sv="(\d+)"/.exec(tag);
  if (v) {
    const ev = /\sev="(\d+)"/.exec(tag);
    return { number: Number(v[1]), endNumber: ev ? Number(ev[1]) : undefined };
  }
  const usfm = /data-usfm="[0-9A-Z]{3}\.\d+\.(\d+)/.exec(tag);
  if (usfm) return { number: Number(usfm[1]) };
  return null;
}

type Role = 'skip' | 'heading' | 'plain';

/** Footnotes and the printed verse numbers are left out of the text. */
function roleOf(className: string): Role {
  const classes = className.split(/\s+/);
  if (classes.some((c) => ['yv-vlbl', 'yv-n', 'note', 'label'].includes(c))) return 'skip';
  if (classes.some((c) => /^(yv-h|s\d?|ms\d?|mr|r|d|sp|qa|heading)$/.test(c))) return 'heading';
  return 'plain';
}

/** Tags that start a new paragraph or line, so the words either side need a space. */
const BLOCK_TAG = /^<\/?(div|p|br|li|h\d)\b/i;

export function htmlToItems(bookId: string, chapter: number, html: string): ChapterItem[] {
  const items: ChapterItem[] = [];
  const verseIndex = new Map<number, number>(); // verse number → position in items
  const stack: Role[] = [];
  let currentVerse: number | null = null;
  let currentEnd: number | undefined;
  let headingText = '';

  function addVerseText(text: string) {
    if (currentVerse === null) return;
    const at = verseIndex.get(currentVerse);
    if (at === undefined) {
      verseIndex.set(currentVerse, items.length);
      items.push({
        type: 'verse',
        number: currentVerse,
        endNumber: currentEnd,
        verseId: verseId(bookId, chapter, currentVerse),
        text,
      });
    } else {
      (items[at] as Extract<ChapterItem, { type: 'verse' }>).text += text;
    }
  }

  // Splits the HTML into tags and the text between them.
  const tokens = html.match(/<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (token.startsWith('<')) {
      if (BLOCK_TAG.test(token)) addVerseText(' ');
      if (token.startsWith('</')) {
        const role = stack.pop();
        if (role === 'heading' && !stack.includes('heading')) {
          const text = headingText.replace(/\s+/g, ' ').trim();
          if (text) items.push({ type: 'heading', text });
          headingText = '';
        }
      } else {
        const verse = verseNumberOf(token);
        if (verse !== null) {
          currentVerse = verse.number;
          currentEnd = verse.endNumber;
        }
        const selfClosing = token.endsWith('/>') || /^<(br|hr|img|wbr)\b/i.test(token);
        if (!selfClosing) stack.push(roleOf(/\bclass="([^"]*)"/.exec(token)?.[1] ?? ''));
      }
    } else if (!stack.includes('skip')) {
      const text = decodeEntities(token);
      if (stack.includes('heading')) headingText += text;
      else addVerseText(text);
    }
  }

  // Tidy up the spaces left between paragraphs.
  for (const item of items) item.text = item.text.replace(/\s+/g, ' ').trim();
  return items.filter((item) => item.text !== '');
}
