/**
 * Number abbreviation utilities.
 * Ported from NumberUtil.java — preserves exact output format.
 */

/**
 * Abbreviates a number using K/M/G/T/P/E suffixes.
 *
 * Ported from NumberUtil.abbreviate(long value) in the legacy banner-api.
 *
 * Examples:
 *   999      → "999"
 *   1_000    → "1K"
 *   1_500    → "1.5K"
 *   15_000   → "15K"
 *   1_500_000 → "1.5M"
 */
export const abbreviateNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  const n = Math.trunc(value);
  if (n < 0) return `-${abbreviateNumber(-n)}`;
  if (n < 1000) return String(n);

  const thresholds: [number, string][] = [
    [1_000_000_000_000_000_000, "E"],
    [1_000_000_000_000_000, "P"],
    [1_000_000_000_000, "T"],
    [1_000_000_000, "G"],
    [1_000_000, "M"],
    [1_000, "K"]
  ];

  for (const [threshold, suffix] of thresholds) {
    if (n >= threshold) {
      const truncated = Math.floor(n / (threshold / 10));
      const hasDecimal = truncated < 100 && truncated % 10 !== 0;
      return hasDecimal
        ? `${String(truncated / 10)}${suffix}`
        : `${String(Math.floor(truncated / 10))}${suffix}`;
    }
  }

  return String(n);
};
