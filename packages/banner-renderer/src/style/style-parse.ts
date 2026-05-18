import {
  readNamespacedRaw,
  parseIntegerParameter,
  parseEnumParameter,
  type RawQuery
} from "@mcbanners/domain";

import { parseHexColor } from "./hex-color";
import { shadowPresetValues, type ShadowPreset } from "./shadow-preset";
import type { BannerStyleSettings } from "./style-settings";

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

export const parseBannerStyleSettings = (rawQuery: RawQuery): BannerStyleSettings | null => {
  if (!hasAnyStyleField(rawQuery)) {
    return null;
  }

  const version = readNamespacedRaw("style", "version", rawQuery);
  if (version !== undefined && version !== "1") {
    return null;
  }

  const rawMode = readNamespacedRaw("background", "mode", rawQuery);
  const mode =
    parseEnumParameter(rawMode, ["template", "solid"] as const, "template") ?? "template";

  const rawBgColor = readNamespacedRaw("background", "color", rawQuery);
  const bgColor = rawBgColor !== undefined ? parseHexColor(rawBgColor) : null;

  const rawPrimary = readNamespacedRaw("text", "primary_color", rawQuery);
  const primaryColor = rawPrimary !== undefined ? parseHexColor(rawPrimary) : null;

  const rawSecondary = readNamespacedRaw("text", "secondary_color", rawQuery);
  const secondaryColor = rawSecondary !== undefined ? parseHexColor(rawSecondary) : null;

  const rawAccent = readNamespacedRaw("text", "accent_color", rawQuery);
  const accentColor = rawAccent !== undefined ? parseHexColor(rawAccent) : null;

  const rawShadow = readNamespacedRaw("shadow", "preset", rawQuery);
  const shadowPreset: ShadowPreset | null = parseEnumParameter(
    rawShadow,
    shadowPresetValues,
    null
  );

  const rawLogoY = readNamespacedRaw("logo", "y", rawQuery);
  const parsedLogoY = parseIntegerParameter(rawLogoY, 0) ?? 0;
  const logoYOffset = Math.max(-50, Math.min(50, parsedLogoY));

  return {
    version: 1,
    background: { mode, color: bgColor },
    text: { primaryColor, secondaryColor, accentColor },
    shadowPreset,
    logoYOffset
  };
};
