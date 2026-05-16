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

import { DEFAULT_MEMBER_BANNER_SETTINGS } from "./member-banner-defaults";
import type { MemberBannerSettings, MemberBannerTextSettings } from "./member-banner-settings";

const parseTextNamespace = (
  namespace: string,
  rawQuery: RawQuery | null | undefined,
  defaults: MemberBannerTextSettings
): MemberBannerTextSettings => ({
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

export const parseMemberBannerSettings = (
  rawQuery: RawQuery | null | undefined
): MemberBannerSettings => {
  const d = DEFAULT_MEMBER_BANNER_SETTINGS;

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
    memberName: parseTextNamespace("member_name", rawQuery, d.memberName),
    rank: parseTextNamespace("rank", rawQuery, d.rank),
    joined: parseTextNamespace("joined", rawQuery, d.joined),
    posts: parseTextNamespace("posts", rawQuery, d.posts),
    likes: parseTextNamespace("likes", rawQuery, d.likes)
  };
};
