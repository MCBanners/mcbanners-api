import { readNamespacedRaw, type RawQuery } from "@mcbanners/domain";

import { parseHexColor } from "./hex-color";
import { shadowPresetValues } from "./shadow-preset";

export interface StyleValidationError {
  readonly code: string;
  readonly field: string;
  readonly message: string;
}

const STYLE_FIELD_KEYS = [
  "style__version",
  "background__mode",
  "background__color",
  "text__primary_color",
  "text__secondary_color",
  "text__accent_color",
  "shadow__preset",
  "logo__y"
] as const;

const hasAnyStyleField = (rawQuery: RawQuery): boolean =>
  STYLE_FIELD_KEYS.some((key) => key in rawQuery);

export const validateBannerStyleSettings = (rawQuery: RawQuery): StyleValidationError[] => {
  if (!hasAnyStyleField(rawQuery)) {
    return [];
  }

  const errors: StyleValidationError[] = [];

  const version = readNamespacedRaw("style", "version", rawQuery);
  if (version !== undefined && version !== "1") {
    return [
      {
        code: "UNSUPPORTED_STYLE_VERSION",
        field: "style__version",
        message: `Unsupported style version: "${version}". Only version 1 is supported.`
      }
    ];
  }

  const rawMode = readNamespacedRaw("background", "mode", rawQuery);
  let modeIsValidSolid = false;
  if (rawMode !== undefined) {
    const lower = rawMode.toLowerCase();
    if (lower !== "template" && lower !== "solid") {
      errors.push({
        code: "INVALID_BACKGROUND_MODE",
        field: "background__mode",
        message: `Invalid background mode: "${rawMode}". Expected "template" or "solid".`
      });
    } else {
      modeIsValidSolid = lower === "solid";
    }
  }

  const rawBgColor = readNamespacedRaw("background", "color", rawQuery);
  if (modeIsValidSolid && rawBgColor === undefined) {
    errors.push({
      code: "MISSING_BACKGROUND_COLOR",
      field: "background__color",
      message: 'background__color is required when background__mode is "solid".'
    });
  }
  if (rawBgColor !== undefined && parseHexColor(rawBgColor) === null) {
    errors.push({
      code: "INVALID_HEX_COLOR",
      field: "background__color",
      message: `Invalid hex color: "${rawBgColor}".`
    });
  }

  const colorFields = [
    { key: "text__primary_color", ns: "text", k: "primary_color" },
    { key: "text__secondary_color", ns: "text", k: "secondary_color" },
    { key: "text__accent_color", ns: "text", k: "accent_color" }
  ] as const;

  for (const { key, ns, k } of colorFields) {
    const raw = readNamespacedRaw(ns, k, rawQuery);
    if (raw !== undefined && parseHexColor(raw) === null) {
      errors.push({
        code: "INVALID_HEX_COLOR",
        field: key,
        message: `Invalid hex color: "${raw}".`
      });
    }
  }

  const rawShadow = readNamespacedRaw("shadow", "preset", rawQuery);
  if (rawShadow !== undefined) {
    const validPreset = (shadowPresetValues as readonly string[]).includes(
      rawShadow.toLowerCase()
    );
    if (!validPreset) {
      errors.push({
        code: "INVALID_SHADOW_PRESET",
        field: "shadow__preset",
        message: `Invalid shadow preset: "${rawShadow}". Expected "none", "soft", or "strong".`
      });
    }
  }

  const rawLogoY = readNamespacedRaw("logo", "y", rawQuery);
  if (rawLogoY !== undefined) {
    const isInteger = /^[+-]?\d+$/.test(rawLogoY);
    if (!isInteger) {
      errors.push({
        code: "INVALID_LOGO_Y",
        field: "logo__y",
        message: `Invalid logo__y: "${rawLogoY}". Must be an integer between -50 and 50.`
      });
    } else {
      const val = Number.parseInt(rawLogoY, 10);
      if (val < -50 || val > 50) {
        errors.push({
          code: "INVALID_LOGO_Y",
          field: "logo__y",
          message: `Invalid logo__y: ${String(val)}. Must be between -50 and 50.`
        });
      }
    }
  }

  return errors;
};
