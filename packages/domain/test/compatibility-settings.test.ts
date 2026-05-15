import { describe, expect, test } from "bun:test";

import { textAlignValues } from "@mcbanners/domain/compatibility/enums";
import {
  filterNamespace,
  namespacedKey,
  parseBooleanParameter,
  parseEnumParameter,
  parseIntegerParameter,
  parseJavaBoolean,
  parseStringParameter,
  rawQuerySchema,
  readBooleanParameter,
  readEnumParameter,
  readIntegerParameter,
  readNamespacedRaw,
  readStringParameter
} from "@mcbanners/domain/compatibility/settings";

describe("legacy settings primitives", () => {
  const rawQuery = {
    author_name__font_bold: "TRUE",
    author_name__font_size: "18",
    author_name__text_align: "center",
    author_name__display: "Custom Author",
    logo__x: "12",
    unrelated: "ignored"
  };

  test("validates raw query records with Zod", () => {
    expect(rawQuerySchema.parse(rawQuery)).toEqual(rawQuery);
    expect(() => rawQuerySchema.parse({ ok: 1 })).toThrow();
  });

  test("builds and reads namespace__key names", () => {
    expect(namespacedKey("author_name", "font_size")).toBe("author_name__font_size");
    expect(namespacedKey("", "font_size")).toBe("font_size");
    expect(readNamespacedRaw("author_name", "font_size", rawQuery)).toBe("18");
    expect(readNamespacedRaw("author_name", "missing", rawQuery)).toBeUndefined();
    expect(readNamespacedRaw("author_name", "font_size", undefined)).toBeUndefined();
  });

  test("filters namespace keys and ignores unrelated params", () => {
    expect(filterNamespace("author_name", rawQuery)).toEqual({
      author_name__font_bold: "TRUE",
      author_name__font_size: "18",
      author_name__text_align: "center",
      author_name__display: "Custom Author"
    });
    expect(filterNamespace("missing", rawQuery)).toEqual({});
    expect(filterNamespace("author_name", null)).toEqual({});
  });

  test("matches Java Boolean.parseBoolean semantics", () => {
    expect(parseJavaBoolean("true")).toBe(true);
    expect(parseJavaBoolean("TRUE")).toBe(true);
    expect(parseJavaBoolean("TrUe")).toBe(true);
    expect(parseJavaBoolean(" false ")).toBe(false);
    expect(parseJavaBoolean("yes")).toBe(false);
    expect(parseJavaBoolean("1")).toBe(false);
    expect(parseBooleanParameter(undefined, true)).toBe(true);
    expect(parseBooleanParameter("not true", true)).toBe(false);
    expect(readBooleanParameter("author_name", "font_bold", rawQuery, false)).toBe(true);
  });

  test("parses integers with Java-like fallback on invalid input", () => {
    expect(parseIntegerParameter("18", 14)).toBe(18);
    expect(parseIntegerParameter("-4", 14)).toBe(-4);
    expect(parseIntegerParameter("+4", 14)).toBe(4);
    expect(parseIntegerParameter("18px", 14)).toBe(14);
    expect(parseIntegerParameter("1.2", 14)).toBe(14);
    expect(parseIntegerParameter(undefined, 14)).toBe(14);
    expect(parseIntegerParameter("2147483647", 14)).toBe(2_147_483_647);
    expect(parseIntegerParameter("2147483648", 14)).toBe(14);
    expect(parseIntegerParameter("-2147483649", 14)).toBe(14);
    expect(readIntegerParameter("author_name", "font_size", rawQuery, 14)).toBe(18);
  });

  test("parses enum constants case-insensitively with fallback", () => {
    expect(parseEnumParameter("center", textAlignValues, "LEFT")).toBe("CENTER");
    expect(parseEnumParameter("RIGHT", textAlignValues, "LEFT")).toBe("RIGHT");
    expect(parseEnumParameter("middle", textAlignValues, "LEFT")).toBe("LEFT");
    expect(parseEnumParameter(undefined, textAlignValues, "LEFT")).toBe("LEFT");
    expect(readEnumParameter("author_name", "text_align", rawQuery, textAlignValues, "LEFT")).toBe(
      "CENTER"
    );
  });

  test("parses strings with default fallback", () => {
    expect(parseStringParameter("hello", "default")).toBe("hello");
    expect(parseStringParameter("", "default")).toBe("");
    expect(parseStringParameter(undefined, "default")).toBe("default");
    expect(readStringParameter("author_name", "display", rawQuery, "")).toBe("Custom Author");
    expect(readStringParameter("author_name", "missing", rawQuery, "")).toBe("");
  });
});
