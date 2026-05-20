import type { RawQuery } from "@mcbanners/domain";

import { parseBannerStyleSettings } from "./style-parse";

export const canonicalizeBannerStyleSettings = (rawQuery: RawQuery): Record<string, string> => {
  const style = parseBannerStyleSettings(rawQuery);
  if (style === null) {
    return {};
  }

  const out: Record<string, string> = {};

  if (style.background.mode !== "template") {
    out["background__mode"] = style.background.mode;
  }
  if (style.background.color !== null) {
    out["background__color"] = style.background.color;
  }
  if (style.text.primaryColor !== null) {
    out["text__primary_color"] = style.text.primaryColor;
  }
  if (style.text.secondaryColor !== null) {
    out["text__secondary_color"] = style.text.secondaryColor;
  }
  if (style.text.accentColor !== null) {
    out["text__accent_color"] = style.text.accentColor;
  }
  if (style.shadowPreset !== null) {
    out["shadow__preset"] = style.shadowPreset;
  }
  if (style.logoYOffset !== 0) {
    out["logo__y"] = String(style.logoYOffset);
  }

  if (Object.keys(out).length > 0) {
    out["style__version"] = "1";
  }

  return out;
};
