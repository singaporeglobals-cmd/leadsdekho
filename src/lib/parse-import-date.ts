/**
 * Parse a date value from an imported lead file.
 *
 * Supports the following input formats (case-insensitive, separators: . - /):
 *   - "DD.MM.YY"     e.g. "15.01.24"   → 2024-01-15  (Excel-style 2-digit year, cutoff at 30)
 *   - "DD.MM.YYYY"   e.g. "15.01.2024" → 2024-01-15
 *   - "DD-MM-YYYY"   e.g. "15-01-2024" → 2024-01-15
 *   - "DD/MM/YYYY"   e.g. "15/01/2024" → 2024-01-15
 *   - "YYYY-MM-DD"   e.g. "2024-01-15" → 2024-01-15  (ISO)
 *   - "YYYY/MM/DD"   e.g. "2024/01/15" → 2024-01-15
 *   - Excel serial number (string or number) e.g. 45658 → corresponding date
 *   - JS Date object (passed through)
 *   - Strings with time component e.g. "15.01.2024 10:30" → date part only
 *
 * Returns null if the input cannot be parsed (caller should fall back to current date).
 *
 * NOTE: We deliberately use local-time `new Date(year, month-1, day, 12, 0, 0)` to avoid
 * off-by-one timezone issues when displaying the date back to the user. Noon local time
 * means even with timezone shifts of ±12 hours, the calendar date stays the same.
 */
export function parseImportDate(input: unknown): Date | null {
  if (input == null) return null;

  // Already a Date — return as-is (or clone)
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : new Date(input);
  }

  // Excel serial number (number, or numeric string like "45658")
  if (typeof input === "number") {
    return excelSerialToDate(input);
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Try numeric string → Excel serial
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      // Excel serial date range: 1 (1900-01-01) to ~60000 (year 2064)
      if (num >= 1 && num <= 60000) {
        return excelSerialToDate(num);
      }
    }

    // Strip any time component (e.g. "15.01.2024 10:30:00" → "15.01.2024")
    const datePart = trimmed.split(/[\sT]/)[0];

    // Try ISO format YYYY-MM-DD or YYYY/MM/DD first
    const isoMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try DD-MM-YYYY / DD.MM.YY / DD/MM/YYYY patterns
    const ddMatch = datePart.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
    if (ddMatch) {
      const [, d, m, y] = ddMatch;
      let year = Number(y);
      if (year < 100) {
        // 2-digit year: 00-29 → 2000-2029, 30-99 → 1930-1999 (Excel rule)
        year = year <= 29 ? 2000 + year : 1900 + year;
      }
      const date = new Date(year, Number(m) - 1, Number(d), 12, 0, 0);
      // Validate that the date is actually valid (e.g. reject 31.02.2024)
      if (
        isNaN(date.getTime()) ||
        date.getDate() !== Number(d) ||
        date.getMonth() !== Number(m) - 1 ||
        date.getFullYear() !== year
      ) {
        return null;
      }
      return date;
    }
  }

  return null;
}

/**
 * Convert an Excel serial date number to a JS Date.
 *
 * Excel's epoch is 1899-12-30 (compensates for the 1900 leap year bug).
 * Serial 1 = 1900-01-01, Serial 45658 = 2024-12-30, etc.
 */
function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 60000) return null;
  // Excel epoch: December 30, 1899 (UTC)
  const excelEpoch = Date.UTC(1899, 11, 30);
  // Excel serial is in days; convert to ms
  const ms = excelEpoch + serial * 24 * 60 * 60 * 1000;
  const date = new Date(ms);
  // Set to noon local time to preserve the calendar date across TZ shifts
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0
  );
}
