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
export declare const truncateText: (text: string, maxChars: number) => string;
//# sourceMappingURL=truncate.d.ts.map
