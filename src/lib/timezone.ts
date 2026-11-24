// IST (India Standard Time) = UTC+05:30, no daylight saving.
//
// Vercel serverless functions run in UTC, but all our users are in IST. These
// helpers convert between IST calendar days and absolute UTC moments so that
// follow-up filtering and auto-complete use the day the USER means, not the
// server's UTC day. All math is pure Date arithmetic and works in both the
// browser and Node (no environment / process.env.TZ dependency).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19_800_000

/** IST calendar parts of a UTC Date (month is 1-indexed for readability). */
export function toISTParts(date: Date) {
  // Shift the instant forward by the IST offset, then read the result as if it
  // were UTC — that yields the IST wall-clock components.
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1, // 1-indexed
    day: ist.getUTCDate(),
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
    seconds: ist.getUTCSeconds(),
  };
}

/** "YYYY-MM-DD" for the IST calendar day of a UTC Date. */
export function toISTDateString(date: Date): string {
  const { year, month, day } = toISTParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM-DDThh:mm" for the IST wall-clock of a UTC Date (for datetime-local inputs). */
export function toISTDateTimeLocalString(date: Date): string {
  const { year, month, day, hours, minutes } = toISTParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * For a "YYYY-MM-DD" IST calendar date, the [start, end] UTC Date range that
 * covers that whole IST day (start = 00:00:00.000 IST, end = 23:59:59.999 IST).
 */
export function istDayRange(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { start, end };
}

/** UTC Date for the start of "today" in IST (00:00:00.000 IST). */
export function istStartOfToday(): Date {
  const { year, month, day } = toISTParts(new Date());
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
}

/** UTC Date for the end of "today" in IST (23:59:59.999 IST). */
export function istEndOfToday(): Date {
  const { year, month, day } = toISTParts(new Date());
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);
}

/**
 * A <input type="datetime-local"> value has NO timezone offset (e.g.
 * "2026-11-25T10:00"). All our users are in IST, so we append "+05:30" before
 * parsing so new Date() yields the correct absolute UTC moment regardless of
 * the server's TZ. Values that already carry an offset or are Zulu time are
 * returned unchanged. An empty value falls back to "now".
 */
export function parseISTDateTimeLocal(value: string): Date {
  if (!value) return new Date();
  const hasOffset = /[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value);
  return hasOffset ? new Date(value) : new Date(`${value}+05:30`);
}
