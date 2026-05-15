const longMinValue = -9_223_372_036_854_775_808n;
const suffixes = [
  [1_000_000_000_000_000_000n, "E"],
  [1_000_000_000_000_000n, "P"],
  [1_000_000_000_000n, "T"],
  [1_000_000_000n, "G"],
  [1_000_000n, "M"],
  [1_000n, "K"]
] as const;

export const abbreviateNumber = (value: number | bigint): string => {
  const longValue = typeof value === "bigint" ? value : BigInt(Math.trunc(value));

  if (longValue === longMinValue) {
    return abbreviateNumber(longMinValue + 1n);
  }

  if (longValue < 0n) {
    return `-${abbreviateNumber(-longValue)}`;
  }

  if (longValue < 1_000n) {
    return longValue.toString();
  }

  const suffixEntry = suffixes.find(([threshold]) => longValue >= threshold);

  if (suffixEntry === undefined) {
    return longValue.toString();
  }

  const [divideBy, suffix] = suffixEntry;
  const truncated = longValue / (divideBy / 10n);
  const hasDecimal = truncated < 100n && truncated % 10n !== 0n;

  return hasDecimal
    ? `${String(Number(truncated) / 10)}${suffix}`
    : `${String(truncated / 10n)}${suffix}`;
};

export const cleanupEnumConstant = (name: string): string =>
  name
    .toLowerCase()
    .split("_")
    .map((piece) => `${piece.substring(0, 1).toUpperCase()}${piece.substring(1)}`)
    .join(" ");

export const generateMnemonic = (random = Math.random): string => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let mnemonic = "";

  for (let index = 0; index < 14; index += 1) {
    mnemonic += alphabet[Math.floor(random() * alphabet.length)] ?? "A";
  }

  return mnemonic;
};

export const truncateAfter = (value: string, chars: number): string => {
  if (chars <= 0 || chars > value.length) {
    return value;
  }

  const segmenter = new Intl.Segmenter("en", { granularity: "word" });
  let precedingBoundary: number | undefined;

  for (const segment of segmenter.segment(value)) {
    if (segment.index >= chars) {
      break;
    }

    precedingBoundary = segment.index;
  }

  return precedingBoundary === undefined ? value : value.substring(0, precedingBoundary);
};
