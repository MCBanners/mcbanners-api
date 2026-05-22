import {
  backgroundTemplateValues,
  fontFaceValues,
  type RawQuery,
  readBooleanParameter,
  readEnumParameter,
  readIntegerParameter,
  readStringParameter,
  textAlignValues
} from "@mcbanners/domain";

import { DEFAULT_TEAM_BANNER_SETTINGS } from "./team-banner-defaults";
import type { TeamBannerSettings, TeamBannerTextSettings } from "./team-banner-settings";

const parseTextNamespace = (
  namespace: string,
  rawQuery: RawQuery | null | undefined,
  defaults: TeamBannerTextSettings
): TeamBannerTextSettings => ({
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

export const parseTeamBannerSettings = (
  rawQuery: RawQuery | null | undefined
): TeamBannerSettings => {
  const d = DEFAULT_TEAM_BANNER_SETTINGS;

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
    teamName: parseTextNamespace("team_name", rawQuery, d.teamName),
    resourceCount: parseTextNamespace("resource_count", rawQuery, d.resourceCount),
    downloads: parseTextNamespace("downloads", rawQuery, d.downloads),
    ratings: parseTextNamespace("ratings", rawQuery, d.ratings)
  };
};
