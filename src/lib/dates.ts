/**
 * Dates in Philippine time. A "day" runs midnight to midnight in Asia/Manila,
 * so a leader reading at 11:30 pm still counts for that day, wherever the phone
 * thinks it is.
 *
 * The Philippines is always UTC+8 (no daylight saving), so we shift the clock
 * by 8 hours and read the UTC date. Dates are 'YYYY-MM-DD' strings, the same
 * format Postgres uses for `date` columns.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in Manila, e.g. '2026-10-24'. Pass -1 for yesterday. */
export function manilaDate(daysFromToday = 0): string {
  return new Date(Date.now() + MANILA_OFFSET_MS + daysFromToday * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** '2026-10-30' → 'Oct 30' */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

/** '2026-10-30' → 'F' (the weekday's first letter) */
export function weekdayLetter(date: string): string {
  return WEEKDAY_LETTERS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/** True if the date is today or yesterday in Manila (the only days you can check in). */
export function isCheckinDateAllowed(date: string): boolean {
  return date === manilaDate(0) || date === manilaDate(-1);
}
