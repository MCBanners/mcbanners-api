import {
  backgroundTemplateValues,
  fontFaceValues,
  readBooleanParameter,
  readEnumParameter,
  readIntegerParameter,
  readStringParameter,
  textAlignValues,
  type RawQuery
} from "@mcbanners/domain";

import { DEFAULT_AUTHOR_BANNER_SETTINGS } from "./author-banner-defaults";
import type { AuthorBannerSettings, AuthorBannerTextSettings } from "./author-banner-settings";

const parseTextNamespace = (
  namespace: string,
  rawQuery: RawQuery | null | undefined,
  defaults: AuthorBannerTextSettings
): AuthorBannerTextSettings => ({
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

export const parseAuthorBannerSettings = (
  rawQuery: RawQuery | null | undefined
): AuthorBannerSettings => {
  const d = DEFAULT_AUTHOR_BANNER_SETTINGS;

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
    authorName: parseTextNamespace("author_name", rawQuery, d.authorName),
    resourceCount: parseTextNamespace("resource_count", rawQuery, d.resourceCount),
    likes: parseTextNamespace("likes", rawQuery, d.likes),
    downloads: parseTextNamespace("downloads", rawQuery, d.downloads),
    reviews: parseTextNamespace("reviews", rawQuery, d.reviews)
  };
};
