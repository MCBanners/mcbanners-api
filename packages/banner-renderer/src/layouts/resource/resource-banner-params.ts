import {
  backgroundTemplateValues,
  fontFaceValues,
  readBooleanParameter,
  readEnumParameter,
  readIntegerParameter,
  readStringParameter,
  textAlignValues
} from "@mcbanners/domain";
import type { RawQuery } from "@mcbanners/domain";

import { DEFAULT_RESOURCE_BANNER_SETTINGS } from "./resource-banner-defaults";
import type {
  ResourceBannerSettings,
  ResourceBannerTextSettings
} from "./resource-banner-settings";

/**
 * Parses a single text parameter namespace from rawQuery, falling back to
 * provided defaults for each missing key.
 *
 * Mirrors the per-namespace parsing in ResourceParameters.java.
 */
const parseTextNamespace = (
  namespace: string,
  rawQuery: RawQuery | null | undefined,
  defaults: ResourceBannerTextSettings
): ResourceBannerTextSettings => ({
  x: readIntegerParameter(namespace, "x", rawQuery, defaults.x) ?? defaults.x,
  y: readIntegerParameter(namespace, "y", rawQuery, defaults.y) ?? defaults.y,
  fontSize:
    readIntegerParameter(namespace, "font_size", rawQuery, defaults.fontSize) ?? defaults.fontSize,
  fontBold:
    readBooleanParameter(namespace, "font_bold", rawQuery, defaults.fontBold) ?? defaults.fontBold,
  fontFace:
    readEnumParameter(namespace, "font_face", rawQuery, fontFaceValues, defaults.fontFace) ??
    defaults.fontFace,
  textAlign:
    readEnumParameter(namespace, "text_align", rawQuery, textAlignValues, defaults.textAlign) ??
    defaults.textAlign,
  display:
    readStringParameter(namespace, "display", rawQuery, defaults.display) ?? defaults.display,
  enable: readBooleanParameter(namespace, "enable", rawQuery, defaults.enable) ?? defaults.enable,
  maxChars:
    readIntegerParameter(namespace, "max_chars", rawQuery, defaults.maxChars) ?? defaults.maxChars
});

/**
 * Parses raw query parameters into a fully-resolved ResourceBannerSettings.
 *
 * Missing parameters fall back to DEFAULT_RESOURCE_BANNER_SETTINGS values,
 * preserving the same defaults as ResourceParameters.java.
 *
 * Namespace/key mappings:
 *   background__template, logo__x, logo__size,
 *   resource_name__{x,y,font_size,font_bold,font_face,text_align,display,enable,max_chars}
 *   author_name__{...}, reviews__{...}, updated__{...},
 *   stars__{x,y,gap},
 *   downloads__{...}, price__{...}
 */
export const parseResourceBannerSettings = (
  rawQuery: RawQuery | null | undefined
): ResourceBannerSettings => {
  const d = DEFAULT_RESOURCE_BANNER_SETTINGS;

  return {
    background: {
      template:
        readEnumParameter(
          "background",
          "template",
          rawQuery,
          backgroundTemplateValues,
          d.background.template
        ) ?? d.background.template
    },
    logo: {
      x: readIntegerParameter("logo", "x", rawQuery, d.logo.x) ?? d.logo.x,
      size: readIntegerParameter("logo", "size", rawQuery, d.logo.size) ?? d.logo.size
    },
    resourceName: parseTextNamespace("resource_name", rawQuery, d.resourceName),
    authorName: parseTextNamespace("author_name", rawQuery, d.authorName),
    reviews: parseTextNamespace("reviews", rawQuery, d.reviews),
    updated: parseTextNamespace("updated", rawQuery, d.updated),
    stars: {
      x: readIntegerParameter("stars", "x", rawQuery, d.stars.x) ?? d.stars.x,
      y: readIntegerParameter("stars", "y", rawQuery, d.stars.y) ?? d.stars.y,
      gap: readIntegerParameter("stars", "gap", rawQuery, d.stars.gap) ?? d.stars.gap
    },
    downloads: parseTextNamespace("downloads", rawQuery, d.downloads),
    price: parseTextNamespace("price", rawQuery, d.price)
  };
};
