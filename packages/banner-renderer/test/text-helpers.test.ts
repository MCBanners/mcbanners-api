import { describe, expect, test } from "bun:test";
import type { TextMeasurer } from "@mcbanners/banner-renderer";
import { computeAlignedX, truncateText, wrapText } from "@mcbanners/banner-renderer";

describe("wrapText", () => {
  test("returns single element when text fits within maxWidth", () => {
    const measurer = (t: string): number => t.length * 7;
    const result = wrapText(measurer, "hello", 200);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("hello");
  });

  test("wraps at word boundary when text exceeds maxWidth", () => {
    // Each character is 10px wide; maxWidth 50 allows ~5 chars
    const measurer = (t: string): number => t.length * 10;
    const result = wrapText(measurer, "hello world foo", 50);

    expect(result.length).toBeGreaterThan(1);
    for (const line of result) {
      expect(measurer(line)).toBeLessThanOrEqual(50 + 10); // allow off-by-one for trim
    }
  });

  test("returns empty array for empty string (no lines to draw)", () => {
    const measurer: TextMeasurer = () => 0;
    const result = wrapText(measurer, "", 100);

    // Empty input produces no lines — matches Java StringUtil.wrap behavior
    // where wrapLineInto skips empty strings (len == 0 guard).
    expect(result).toEqual([]);
  });

  test("preserves existing newlines as line splits", () => {
    const measurer: TextMeasurer = () => 0; // always fits
    const result = wrapText(measurer, "line one\nline two\nline three", 9999);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("line one");
    expect(result[1]).toBe("line two");
    expect(result[2]).toBe("line three");
  });

  test("handles CRLF line endings", () => {
    const measurer: TextMeasurer = () => 0;
    const result = wrapText(measurer, "first\r\nsecond", 9999);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe("first");
    expect(result[1]).toBe("second");
  });

  test("trims whitespace from wrapped line edges", () => {
    const measurer = (t: string): number => t.length * 10;
    const result = wrapText(measurer, "hello world foo", 55);

    for (const line of result) {
      expect(line).toBe(line.trim());
    }
  });

  test("wraps long word without whitespace without infinite loop", () => {
    const measurer = (t: string): number => t.length * 10;
    const result = wrapText(measurer, "superlongwordwithoutspaces", 50);

    expect(result.length).toBeGreaterThan(0);
    const rejoined = result.join("");
    expect(rejoined).toBe("superlongwordwithoutspaces");
  });

  test("wraps correctly with hyphen break points", () => {
    const measurer = (t: string): number => t.length * 10;
    const result = wrapText(measurer, "pre-wrap-this-text", 60);

    expect(result.length).toBeGreaterThan(1);
  });

  test("is stable: same input always produces same output", () => {
    const measurer = (t: string): number => t.length * 8;
    const text = "The quick brown fox jumps over the lazy dog";

    const first = wrapText(measurer, text, 120);
    const second = wrapText(measurer, text, 120);

    expect(first).toEqual(second);
  });
});

describe("truncateText", () => {
  test("returns original string when maxChars >= length", () => {
    expect(truncateText("hello", 10)).toBe("hello");
    expect(truncateText("hello", 5)).toBe("hello");
  });

  test("truncates at word boundary before maxChars", () => {
    // "hello world foo" — maxChars=11 should find boundary before 'world' end
    const result = truncateText("hello world foo", 11);
    expect(result).toBe("hello");
  });

  test("truncates at word boundary matching legacy behavior", () => {
    // maxChars=6: text is "hello world", boundary before position 6 is at 5 (space)
    const result = truncateText("hello world", 6);
    expect(result).toBe("hello");
  });

  test("truncates at maxChars when no whitespace found before limit", () => {
    const result = truncateText("nospacehere", 5);
    expect(result).toBe("nospa");
  });

  test("handles empty string", () => {
    expect(truncateText("", 10)).toBe("");
  });

  test("is stable: same input always produces same output", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    expect(truncateText(text, 20)).toBe(truncateText(text, 20));
  });
});

describe("computeAlignedX", () => {
  test("left align returns x directly regardless of text width", () => {
    expect(computeAlignedX(468, 100, 56, "left")).toBe(56);
    expect(computeAlignedX(468, 200, 0, "left")).toBe(0);
  });

  test("center align centres text within surface width plus offset", () => {
    // (468 - 100) / 2 + 0 = 184
    expect(computeAlignedX(468, 100, 0, "center")).toBe(184);
    // (468 - 100) / 2 + 10 = 194
    expect(computeAlignedX(468, 100, 10, "center")).toBe(194);
  });

  test("right align right-aligns text within surface plus offset", () => {
    // 468 - 100 + 0 = 368
    expect(computeAlignedX(468, 100, 0, "right")).toBe(368);
    // 468 - 100 + 5 = 373
    expect(computeAlignedX(468, 100, 5, "right")).toBe(373);
  });

  test("center align with zero-width text returns surface midpoint plus offset", () => {
    expect(computeAlignedX(468, 0, 0, "center")).toBe(234);
  });

  test("right align with text wider than surface returns negative x", () => {
    // text wider than surface — x is negative, matching legacy behavior
    expect(computeAlignedX(100, 200, 0, "right")).toBe(-100);
  });
});
