import { getBackgroundTemplateTextTheme } from "@mcbanners/domain";

import { mapFontFace } from "../../compat/font-face";
import { mapTextAlign } from "../../compat/text-align";
import { resolveTextColor } from "../../compat/text-theme";
import type { RenderNode } from "../../nodes/render-node";
import type { BannerStyleSettings } from "../../style";
import type { TextShadow } from "../../style";
import { SHADOW_PRESETS } from "../../style";
import type { RgbaColor } from "../../types/rgba-color";
import { WHITE, rgbaColor } from "../../types/rgba-color";
import { abbreviateNumber } from "../../text/number-util";
import {
  MEMBER_BANNER_HEIGHT,
  MEMBER_BANNER_LOGO_MAX_SIZE,
  MEMBER_BANNER_WIDTH
} from "./member-banner-defaults";
import type { MemberBannerData } from "./member-banner-data";
import type { MemberBannerSettings, MemberBannerTextSettings } from "./member-banner-settings";

const resolveStyleColor = (hexColor: string | null | undefined, fallback: RgbaColor): RgbaColor => {
  if (hexColor === null || hexColor === undefined) return fallback;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return rgbaColor(r, g, b);
};

const makeTextNode = (
  s: MemberBannerTextSettings,
  content: string,
  color: RgbaColor,
  shadow?: TextShadow
): RenderNode => ({
  type: "text",
  x: s.x,
  y: s.y,
  content,
  fontFace: mapFontFace(s.fontFace),
  fontWeight: s.fontBold ? "bold" : "regular",
  fontSize: s.fontSize,
  color,
  align: mapTextAlign(s.textAlign),
  ...(shadow !== undefined ? { shadow } : {})
});

const feedbackText = (positive: number, negative: number): string => {
  const calculated = positive - negative;
  const sign = calculated > 0 ? "+" : calculated < 0 ? "-" : "";
  return `Feedback: ${sign}${String(calculated)}`;
};

export const buildMemberBannerNodes = (
  data: MemberBannerData,
  settings: MemberBannerSettings,
  style?: BannerStyleSettings | null
): readonly RenderNode[] => {
  const nodes: RenderNode[] = [];

  const textTheme = getBackgroundTemplateTextTheme(settings.background.template);
  const templateFontColor = resolveTextColor(textTheme);
  const baseColor = style?.background.mode === "solid" ? WHITE : templateFontColor;

  const primaryColor = style?.text.primaryColor != null
    ? resolveStyleColor(style.text.primaryColor, baseColor)
    : baseColor;
  const secondaryColor = style?.text.secondaryColor != null
    ? resolveStyleColor(style.text.secondaryColor, baseColor)
    : baseColor;

  const shadowForText: TextShadow | undefined = style?.shadowPreset != null
    ? (SHADOW_PRESETS[style.shadowPreset] ?? undefined)
    : undefined;

  if (style?.background.mode === "solid" && style.background.color !== null) {
    const hex = style.background.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    nodes.push({ type: "fill-rect", x: 0, y: 0, width: MEMBER_BANNER_WIDTH, height: MEMBER_BANNER_HEIGHT, color: rgbaColor(r, g, b) });
  } else {
    nodes.push({
      type: "image",
      x: 0,
      y: 0,
      width: MEMBER_BANNER_WIDTH,
      height: MEMBER_BANNER_HEIGHT,
      assetKey: settings.background.template
    });
  }

  const logoSize = Math.min(settings.logo.size, MEMBER_BANNER_LOGO_MAX_SIZE);
  const logoY = Math.floor((MEMBER_BANNER_HEIGHT - logoSize) / 2) + (style?.logoYOffset ?? 0);
  if (data.member.logoBase64 !== null && data.member.logoBase64 !== "") {
    nodes.push({
      type: "image",
      x: settings.logo.x,
      y: logoY,
      width: logoSize,
      height: logoSize,
      imageData: data.member.logoBase64
    });
  } else {
    nodes.push({
      type: "sprite",
      x: settings.logo.x,
      y: logoY,
      width: logoSize,
      height: logoSize,
      assetKey: "DEFAULT_AUTHOR_LOGO"
    });
  }

  if (settings.memberName.enable) {
    nodes.push(
      makeTextNode(settings.memberName, settings.memberName.display || data.member.name, primaryColor, shadowForText)
    );
  }
  if (settings.rank.enable) {
    nodes.push(
      makeTextNode(settings.rank, settings.rank.display || `Rank: ${data.member.rank}`, secondaryColor, shadowForText)
    );
  }
  if (settings.joined.enable) {
    nodes.push(
      makeTextNode(
        settings.joined,
        settings.joined.display || `Joined: ${data.member.joinDate}`,
        secondaryColor,
        shadowForText
      )
    );
  }
  if (settings.posts.enable) {
    nodes.push(
      makeTextNode(
        settings.posts,
        settings.posts.display || `Posts: ${abbreviateNumber(data.member.posts)}`,
        secondaryColor,
        shadowForText
      )
    );
  }
  if (settings.likes.enable) {
    nodes.push(
      makeTextNode(
        settings.likes,
        settings.likes.display ||
          feedbackText(data.member.positiveFeedback, data.member.negativeFeedback),
        secondaryColor,
        shadowForText
      )
    );
  }

  return nodes;
};
