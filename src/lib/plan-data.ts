/**
 * Reading plan types, and the code that turns a plan file from
 * assets/guided_plans into a tidy `Plan`.
 *
 * This file imports nothing on purpose, so `scripts/check-plans.mts` can run it
 * with plain Node to test the real plan files. The app loads plans through
 * `lib/plans.ts`, never from here directly.
 */

// ---------------------------------------------------------------------------
// The file format, exactly as it is in assets/guided_plans/*.json
// ---------------------------------------------------------------------------

export type RawPlanReading = { book: string; chapter: number; reference: string };

export type RawPlanDay = {
  day: number;
  originalSession?: number;
  title: string;
  reading: RawPlanReading[];
  summary: string;
  reflectionQuestions: string[];
  sourceUrl: string;
};

export type RawPlan = {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  source: { name: string; url: string };
  days: RawPlanDay[];
};

// ---------------------------------------------------------------------------
// What the rest of the app uses
// ---------------------------------------------------------------------------

export type PlanReading = {
  /** As written in the file, e.g. "Mark 1:1-8". */
  reference: string;
  book: string;
  /** The Bible's book code, e.g. "MRK", for opening it in the reader. */
  bookId: string;
  chapter: number;
  /** Only set when the reading is part of a chapter. */
  startVerse?: number;
  endVerse?: number;
};

export type PlanDay = {
  day: number;
  title: string;
  readings: PlanReading[];
  /** All readings in one line, e.g. "Mark 1:40-45; Mark 2:1-12". Saved with the check-in. */
  passage: string;
  summary: string;
  reflectionQuestions: string[];
  sourceUrl: string;
};

export type Plan = {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  /** Who wrote the plan; shown in the app as a credit. */
  source: { name: string; url: string };
  categories: string[];
  /** A Material Symbols icon name, e.g. "menu_book". */
  icon: string;
  tileColor: PlanTileColor;
  /** One short line for plan lists, e.g. "Meet Jesus, one chapter a day". */
  tagline: string;
  days: PlanDay[];
};

export type PlanTileColor = 'green' | 'blue' | 'amber';

// ---------------------------------------------------------------------------
// Things the files don't have yet (they'd become columns if plans move to Supabase)
// ---------------------------------------------------------------------------

type PlanExtras = { categories: string[]; icon: string; tileColor: PlanTileColor; tagline: string };

const PLAN_EXTRAS: Record<string, PlanExtras> = {
  'john-21-day': {
    categories: ['Gospels', 'New believers'],
    icon: 'menu_book',
    tileColor: 'green',
    tagline: 'Meet Jesus, one chapter a day',
  },
  'luke-24-day': {
    categories: ['Gospels', 'Short'],
    icon: 'favorite',
    tileColor: 'green',
    tagline: 'Jesus who seeks and saves the lost',
  },
  'mark-41-day': {
    categories: ['Gospels'],
    icon: 'bolt',
    tileColor: 'blue',
    tagline: 'Short readings through Jesus’ life in action',
  },
  'matthew-28-day': {
    categories: ['Gospels'],
    icon: 'crown',
    tileColor: 'amber',
    tagline: 'Jesus, the King God promised',
  },
};

/** Used for any plan not listed above. */
function defaultExtras(raw: RawPlan): PlanExtras {
  return {
    categories: ['Other'],
    icon: 'menu_book',
    tileColor: 'green',
    tagline: raw.description.split('. ')[0].replace(/\.$/, ''),
  };
}

/** English book names → the codes the Bible uses (USFM), e.g. "1 John" → "1JN". */
const BOOK_IDS: Record<string, string> = {
  Genesis: 'GEN', Exodus: 'EXO', Leviticus: 'LEV', Numbers: 'NUM', Deuteronomy: 'DEU',
  Joshua: 'JOS', Judges: 'JDG', Ruth: 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
  '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH',
  Ezra: 'EZR', Nehemiah: 'NEH', Esther: 'EST', Job: 'JOB', Psalms: 'PSA', Psalm: 'PSA',
  Proverbs: 'PRO', Ecclesiastes: 'ECC', 'Song of Songs': 'SNG', 'Song of Solomon': 'SNG',
  Isaiah: 'ISA', Jeremiah: 'JER', Lamentations: 'LAM', Ezekiel: 'EZK', Daniel: 'DAN',
  Hosea: 'HOS', Joel: 'JOL', Amos: 'AMO', Obadiah: 'OBA', Jonah: 'JON', Micah: 'MIC',
  Nahum: 'NAM', Habakkuk: 'HAB', Zephaniah: 'ZEP', Haggai: 'HAG', Zechariah: 'ZEC',
  Malachi: 'MAL', Matthew: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT',
  Romans: 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', Galatians: 'GAL',
  Ephesians: 'EPH', Philippians: 'PHP', Colossians: 'COL', '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI', Titus: 'TIT',
  Philemon: 'PHM', Hebrews: 'HEB', James: 'JAS', '1 Peter': '1PE', '2 Peter': '2PE',
  '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', Jude: 'JUD', Revelation: 'REV',
};

// ---------------------------------------------------------------------------
// Turning raw files into plans
// ---------------------------------------------------------------------------

/** "Mark 1:1-8" → verses 1 to 8; "Mark 1:5" → verse 5; "Mark 1" → whole chapter. */
const REFERENCE = /^(.+?) (\d+)(?::(\d+)(?:-(\d+))?)?$/;

function toReading(raw: RawPlanReading, where: string): PlanReading {
  const bookId = BOOK_IDS[raw.book];
  if (!bookId) throw new Error(`${where}: unknown book "${raw.book}"`);

  const match = REFERENCE.exec(raw.reference.trim());
  if (!match || match[1] !== raw.book || Number(match[2]) !== raw.chapter) {
    throw new Error(`${where}: reference "${raw.reference}" doesn't match ${raw.book} ${raw.chapter}`);
  }
  const startVerse = match[3] ? Number(match[3]) : undefined;
  const endVerse = match[4] ? Number(match[4]) : startVerse;
  return { reference: raw.reference, book: raw.book, bookId, chapter: raw.chapter, startVerse, endVerse };
}

export function toPlan(raw: RawPlan): Plan {
  const days = raw.days.map((day): PlanDay => {
    const where = `${raw.id} day ${day.day}`;
    const readings = day.reading.map((r) => toReading(r, where));
    return {
      day: day.day,
      title: day.title,
      readings,
      passage: readings.map((r) => r.reference).join('; '),
      summary: day.summary,
      reflectionQuestions: day.reflectionQuestions,
      sourceUrl: day.sourceUrl,
    };
  });
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    durationDays: raw.durationDays,
    source: raw.source,
    ...(PLAN_EXTRAS[raw.id] ?? defaultExtras(raw)),
    days,
  };
}

/**
 * Checks a plan for mistakes that would break the app. Returns a list of
 * problems (empty means it's fine).
 */
export function findProblems(plan: Plan): string[] {
  const problems: string[] = [];
  if (plan.days.length !== plan.durationDays) {
    problems.push(`${plan.id}: durationDays is ${plan.durationDays} but there are ${plan.days.length} days`);
  }
  plan.days.forEach((day, index) => {
    const where = `${plan.id} day ${day.day}`;
    if (day.day !== index + 1) problems.push(`${where}: expected day ${index + 1} here (days must be in order)`);
    if (day.readings.length === 0) problems.push(`${where}: no reading`);
    if (day.passage.length > 100) problems.push(`${where}: passage is over 100 characters`);
    if (day.reflectionQuestions.length === 0) problems.push(`${where}: no reflection questions`);
    for (const r of day.readings) {
      if (r.startVerse && r.endVerse && r.startVerse > r.endVerse) problems.push(`${where}: ${r.reference} runs backwards`);
    }
  });
  return problems;
}
