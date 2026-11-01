// Dates in Philippine time (always UTC+8), as 'YYYY-MM-DD', matching the phone app.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in Manila. Pass -1 for yesterday, and so on. */
export function manilaDate(daysFromToday = 0): string {
  return new Date(Date.now() + MANILA_OFFSET_MS + daysFromToday * DAY_MS).toISOString().slice(0, 10);
}

/** '2026-10-30' → 'Fri, Oct 30' */
export function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
