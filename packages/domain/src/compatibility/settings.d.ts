import { z } from "zod";
export declare const namespaceSeparator = "__";
export declare const rawQuerySchema: z.ZodRecord<z.ZodString, z.ZodString>;
export type RawQuery = z.infer<typeof rawQuerySchema>;
export declare const namespacedKey: (namespace: string | null | undefined, key: string) => string;
export declare const filterNamespace: (
  namespace: string,
  rawQuery: RawQuery | null | undefined
) => Readonly<RawQuery>;
export declare const readNamespacedRaw: (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined
) => string | undefined;
export declare const parseJavaBoolean: (raw: string) => boolean;
export declare const parseBooleanParameter: (
  raw: string | undefined,
  defaultValue?: boolean | null
) => boolean | null;
export declare const parseIntegerParameter: (
  raw: string | undefined,
  defaultValue?: number | null
) => number | null;
export declare const parseStringParameter: (
  raw: string | undefined,
  defaultValue?: string | null
) => string | null;
export declare const parseEnumParameter: <const TValues extends readonly [string, ...string[]]>(
  raw: string | undefined,
  values: TValues,
  defaultValue?: TValues[number] | null
) => TValues[number] | null;
export declare const readBooleanParameter: (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  defaultValue?: boolean | null
) => boolean | null;
export declare const readIntegerParameter: (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  defaultValue?: number | null
) => number | null;
export declare const readStringParameter: (
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  defaultValue?: string | null
) => string | null;
export declare const readEnumParameter: <const TValues extends readonly [string, ...string[]]>(
  namespace: string | null | undefined,
  key: string,
  rawQuery: RawQuery | null | undefined,
  values: TValues,
  defaultValue?: TValues[number] | null
) => TValues[number] | null;
//# sourceMappingURL=settings.d.ts.map
