/**
 * Date formatting utilities for banner layout fields.
 * Ported from Layout.java date() helper — preserves exact output format.
 */

/**
 * Formats an ISO 8601 datetime string as `M/dd/yyyy` in UTC.
 *
 * Ported from SimpleDateFormat("M/dd/yyyy", Locale.ENGLISH) with UTC timezone.
 *
 * Examples:
 *   "2024-01-05T00:00:00Z" → "1/05/2024"
 *   "2024-12-31T23:59:00Z" → "12/31/2024"
 */
export const formatUpdatedDate = (isoDateString: string): string => {
  const d = new Date(isoDateString);
  const month = d.getUTCMonth() + 1;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${String(month)}/${day}/${String(year)}`;
};
