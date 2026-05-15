import { describe, expect, test } from "bun:test";

import {
  abbreviateNumber,
  cleanupEnumConstant,
  generateMnemonic,
  truncateAfter
} from "../src/compatibility/utilities";

describe("Java-compatible utilities", () => {
  test("matches NumberUtil.abbreviate fixtures", () => {
    expect(
      [
        0,
        12,
        999,
        1_000,
        1_234,
        10_000,
        10_500,
        999_999,
        1_000_000,
        1_250_000,
        1_000_000_000,
        1_500_000_000,
        1_000_000_000_000,
        1_000_000_000_000_000,
        1_000_000_000_000_000_000n
      ].map((value) => abbreviateNumber(value))
    ).toEqual([
      "0",
      "12",
      "999",
      "1K",
      "1.2K",
      "10K",
      "10K",
      "999K",
      "1M",
      "1.2M",
      "1G",
      "1.5G",
      "1T",
      "1P",
      "1E"
    ]);
  });

  test("matches NumberUtil.abbreviate negative and Long.MIN_VALUE handling", () => {
    expect(abbreviateNumber(-1_234)).toBe("-1.2K");
    expect(abbreviateNumber(-9_223_372_036_854_775_808n)).toBe("-9.2E");
  });

  test("matches StringUtil.cleanupEnumConstant for legacy enum names", () => {
    expect(cleanupEnumConstant("MOONLIGHT_PURPLE")).toBe("Moonlight Purple");
    expect(cleanupEnumConstant("SOURCE_SANS_PRO")).toBe("Source Sans Pro");
    expect(cleanupEnumConstant("SPIGOT")).toBe("Spigot");
  });

  test("generates 14 alphabetic mnemonic characters", () => {
    const mnemonic = generateMnemonic(() => 0);

    expect(mnemonic).toBe("AAAAAAAAAAAAAA");
    expect(mnemonic).toHaveLength(14);
    expect(/^[A-Za-z]{14}$/.test(generateMnemonic())).toBe(true);
  });

  test("approximates StringUtil.truncateAfter word-boundary behavior", () => {
    expect(truncateAfter("Hello world again", 8)).toBe("Hello ");
    expect(truncateAfter("Hello world again", 5)).toBe("");
    expect(truncateAfter("Hello world again", 99)).toBe("Hello world again");
    expect(truncateAfter("Supercalifragilistic", 8)).toBe("");
  });
});
