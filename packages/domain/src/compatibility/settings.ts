import { z } from "zod";

export const namespaceSeparator = "__";

export const rawQuerySchema = z.record(z.string(), z.string());

export type RawQuery = z.infer<typeof rawQuerySchema>;

export const namespacedKey = (namespace: string | null | undefined, key: string): string =>
  namespace === null || namespace === undefined || namespace === ""
    ? key
    : `${namespace}${namespaceSeparator}${key}`;

export const filterNamespace = (
  namespace: string,
  rawQuery: RawQuery | null | undefined
): Readonly<RawQuery> => {
  if (rawQuery === null || rawQuery === undefined) {
    return Object.freeze({});
  }

  const prefix = `${namespace}${namespaceSeparator}`;
  return Object.freeze(
    Object.fromEntries(Object.entries(rawQuery).filter(([key]) => key.startsWith(prefix)))
  );
};

export const readNamespacedRaw = (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined
): string | undefined => {
  if (rawQuery === null || rawQuery === undefined) {
    return undefined;
  }

  return rawQuery[namespacedKey(namespace, key)];
};

export const parseJavaBoolean = (raw: string): boolean => raw.toLowerCase() === "true";

export const parseBooleanParameter = (
  raw: string | undefined,
  defaultValue: boolean | null = null
): boolean | null => (raw === undefined ? defaultValue : parseJavaBoolean(raw));

export const parseIntegerParameter = (
  raw: string | undefined,
  defaultValue: number | null = null
): number | null => {
  if (raw === undefined) {
    return defaultValue;
  }

  if (!/^[+-]?\d+$/.test(raw)) {
    return defaultValue;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= -2_147_483_648 && parsed <= 2_147_483_647
    ? parsed
    : defaultValue;
};

export const parseStringParameter = (
  raw: string | undefined,
  defaultValue: string | null = null
): string | null => raw ?? defaultValue;

export const parseEnumParameter = <const TValues extends readonly [string, ...string[]]>(
  raw: string | undefined,
  values: TValues,
  defaultValue: TValues[number] | null = null
): TValues[number] | null => {
  if (raw === undefined) {
    return defaultValue;
  }

  const found = values.find((value) => value.toLowerCase() === raw.toLowerCase());
  return found ?? defaultValue;
};

export const readBooleanParameter = (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  defaultValue: boolean | null = null
): boolean | null =>
  parseBooleanParameter(readNamespacedRaw(namespace, key, rawQuery), defaultValue);

export const readIntegerParameter = (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  defaultValue: number | null = null
): number | null =>
  parseIntegerParameter(readNamespacedRaw(namespace, key, rawQuery), defaultValue);

export const readStringParameter = (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  defaultValue: string | null = null
): string | null => parseStringParameter(readNamespacedRaw(namespace, key, rawQuery), defaultValue);

export const readEnumParameter = <const TValues extends readonly [string, ...string[]]>(
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  values: TValues,
  defaultValue: TValues[number] | null = null
): TValues[number] | null =>
  parseEnumParameter(readNamespacedRaw(namespace, key, rawQuery), values, defaultValue);
