/**
 * Truncates `text` to a word boundary at or before `maxChars`.
 *
 * Mirrors the legacy Java `StringUtil.truncateAfter` which uses
 * `BreakIterator.getWordInstance().preceding(maxChars)`. If the input is
 * already within the limit the original string is returned unchanged. If no
 * whitespace boundary exists before `maxChars`, the text is cut exactly at
 * `maxChars`.
 *
 * @param text      The string to truncate.
 * @param maxChars  The maximum character offset (exclusive upper bound).
 */
export const truncateText = (text: string, maxChars: number): string => {
  if (maxChars >= text.length) return text;

  let boundary = maxChars;

  // Walk backward from maxChars to find a whitespace boundary
  while (boundary > 0 && !/\s/u.test(text[boundary - 1]!)) {
    boundary--;
  }

  if (boundary === 0) return text.slice(0, maxChars);

  return text.slice(0, boundary).trimEnd();
};
