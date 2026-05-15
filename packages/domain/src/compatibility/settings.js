import { z } from "zod";
export const namespaceSeparator = "__";
export const rawQuerySchema = z.record(z.string(), z.string());
export const namespacedKey = (namespace, key) => namespace === null || namespace === undefined || namespace === ""
    ? key
    : `${namespace}${namespaceSeparator}${key}`;
export const filterNamespace = (namespace, rawQuery) => {
    if (rawQuery === null || rawQuery === undefined) {
        return Object.freeze({});
    }
    const prefix = `${namespace}${namespaceSeparator}`;
    return Object.freeze(Object.fromEntries(Object.entries(rawQuery).filter(([key]) => key.startsWith(prefix))));
};
export const readNamespacedRaw = (namespace, key, rawQuery) => {
    if (rawQuery === null || rawQuery === undefined) {
        return undefined;
    }
    return rawQuery[namespacedKey(namespace, key)];
};
export const parseJavaBoolean = (raw) => raw.toLowerCase() === "true";
export const parseBooleanParameter = (raw, defaultValue = null) => (raw === undefined ? defaultValue : parseJavaBoolean(raw));
export const parseIntegerParameter = (raw, defaultValue = null) => {
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
export const parseStringParameter = (raw, defaultValue = null) => raw ?? defaultValue;
export const parseEnumParameter = (raw, values, defaultValue = null) => {
    if (raw === undefined) {
        return defaultValue;
    }
    const found = values.find((value) => value.toLowerCase() === raw.toLowerCase());
    return found ?? defaultValue;
};
export const readBooleanParameter = (namespace, key, rawQuery, defaultValue = null) => parseBooleanParameter(readNamespacedRaw(namespace, key, rawQuery), defaultValue);
export const readIntegerParameter = (namespace, key, rawQuery, defaultValue = null) => parseIntegerParameter(readNamespacedRaw(namespace, key, rawQuery), defaultValue);
export const readStringParameter = (namespace, key, rawQuery, defaultValue = null) => parseStringParameter(readNamespacedRaw(namespace, key, rawQuery), defaultValue);
export const readEnumParameter = (namespace, key, rawQuery, values, defaultValue = null) => parseEnumParameter(readNamespacedRaw(namespace, key, rawQuery), values, defaultValue);
