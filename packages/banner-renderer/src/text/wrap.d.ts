import type { TextMeasurer } from "./measure";
/**
 * Wraps `text` into an array of lines that each fit within `maxWidth` pixels.
 *
 * Preserves existing line endings, then further wraps each physical line by
 * breaking at whitespace or hyphen boundaries. Mirrors the legacy Java
 * `StringUtil.wrap` algorithm for compatibility.
 *
 * @param measurer  Function returning rendered pixel width for a string.
 * @param text      The input text to wrap.
 * @param maxWidth  Maximum line width in pixels.
 */
export declare const wrapText: (
  measurer: TextMeasurer,
  text: string,
  maxWidth: number
) => readonly string[];
//# sourceMappingURL=wrap.d.ts.map
