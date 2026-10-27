/**
 * Splits text read from a notebook page into Read, Reflect and Respond.
 *
 * Leaders write a heading for each part. When we see a line that starts with
 * one of these words, the following lines belong to that part. Words are in
 * English, Cebuano and Tagalog. Text before the first heading goes into Read.
 */

export type RrrText = { read: string; reflect: string; respond: string };
type Part = keyof RrrText;

const HEADINGS: Record<Part, string[]> = {
  read: ['read', 'reading', 'basa', 'pagbasa', 'binasa'],
  reflect: ['reflect', 'reflection', 'pamalandong', 'pagnilay', 'pagninilay', 'nilay'],
  respond: ['respond', 'response', 'tubag', 'tugon', 'pagtubag', 'pagtugon', 'prayer', 'pag-ampo', 'panalangin'],
};

/** If the line starts with a heading word, returns which part and the rest of the line. */
function matchHeading(line: string): { part: Part; rest: string } | null {
  // A heading word, then optionally ':' or '-' or '.', then anything else.
  const match = line.match(/^\s*([a-z-]+)\s*[:\-.]?\s*(.*)$/i);
  if (!match) return null;
  const word = match[1].toLowerCase();
  for (const part of Object.keys(HEADINGS) as Part[]) {
    if (HEADINGS[part].includes(word)) return { part, rest: match[2] };
  }
  return null;
}

export function splitRrr(lines: string[]): RrrText {
  const parts: Record<Part, string[]> = { read: [], reflect: [], respond: [] };
  let current: Part = 'read';

  for (const line of lines) {
    const heading = matchHeading(line);
    if (heading) {
      current = heading.part;
      if (heading.rest) parts[current].push(heading.rest);
    } else {
      parts[current].push(line);
    }
  }

  return {
    read: parts.read.join('\n'),
    reflect: parts.reflect.join('\n'),
    respond: parts.respond.join('\n'),
  };
}
