import type { TextMeasurer } from "./measure";

/**
 * Splits text into lines on CR, LF, or CRLF boundaries.
 * A trailing newline does not produce an extra empty string.
 * Ported from legacy Java StringUtil.splitIntoLines.
 */
const splitIntoLines = (text: string): string[] => {
  if (text.length === 0) return [""];

  const lines: string[] = [];
  let lineStart = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\r") {
      const newlineLength = i + 1 < text.length && text[i + 1] === "\n" ? 2 : 1;
      lines.push(text.slice(lineStart, i));
      lineStart = i + newlineLength;
      if (newlineLength === 2) i++;
    } else if (c === "\n") {
      lines.push(text.slice(lineStart, i));
      lineStart = i + 1;
    }
  }

  if (lineStart < text.length) {
    lines.push(text.slice(lineStart));
  }

  return lines;
};

/** Scans backward from `start` for a whitespace or hyphen break point. */
const findBreakBefore = (line: string, start: number): number => {
  for (let i = start; i >= 0; i--) {
    const c = line[i];
    if (c !== undefined && (/\s/u.test(c) || c === "-")) return i;
  }
  return -1;
};

/** Scans forward from `start` for a whitespace or hyphen break point. */
const findBreakAfter = (line: string, start: number): number => {
  for (let i = start; i < line.length; i++) {
    const c = line[i];
    if (c !== undefined && (/\s/u.test(c) || c === "-")) return i;
  }
  return -1;
};

/**
 * Wraps a single line into multiple segments that fit within `maxWidth`.
 * Ported from legacy Java StringUtil.wrapLineInto.
 */
const wrapLineInto = (
  line: string,
  result: string[],
  measurer: TextMeasurer,
  maxWidth: number
): void => {
  let remaining = line;
  let len = remaining.length;

  while (len > 0) {
    const width = measurer(remaining);
    if (width <= maxWidth) break;

    const guess = Math.floor((len * maxWidth) / width);
    const before = remaining.slice(0, guess).trim();
    const beforeWidth = measurer(before);

    let pos: number;
    if (beforeWidth > maxWidth) {
      pos = findBreakBefore(remaining, guess);
    } else {
      pos = findBreakAfter(remaining, guess);
      if (pos !== -1) {
        const candidate = remaining.slice(0, pos).trim();
        if (measurer(candidate) > maxWidth) {
          pos = findBreakBefore(remaining, guess);
        }
      }
    }

    if (pos === -1) pos = guess;

    result.push(remaining.slice(0, pos).trim());
    remaining = remaining.slice(pos).trim();
    len = remaining.length;
  }

  if (len > 0) result.push(remaining);
};

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
export const wrapText = (
  measurer: TextMeasurer,
  text: string,
  maxWidth: number
): readonly string[] => {
  const lines = splitIntoLines(text);
  const result: string[] = [];

  for (const line of lines) {
    wrapLineInto(line, result, measurer, maxWidth);
  }

  return result;
};
