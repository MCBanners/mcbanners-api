import { getBackgroundTemplateTextTheme } from "@mcbanners/domain";

import { mapFontFace } from "../../compat/font-face";
import { mapTextAlign } from "../../compat/text-align";
import { resolveTextColor } from "../../compat/text-theme";
import type { RenderNode } from "../../nodes/render-node";
import { abbreviateNumber } from "../../text/number-util";
import {
  MEMBER_BANNER_HEIGHT,
  MEMBER_BANNER_LOGO_MAX_SIZE,
  MEMBER_BANNER_WIDTH
} from "./member-banner-defaults";
import type { MemberBannerData } from "./member-banner-data";
import type { MemberBannerSettings, MemberBannerTextSettings } from "./member-banner-settings";

const makeTextNode = (
  s: MemberBannerTextSettings,
  content: string,
  color: ReturnType<typeof resolveTextColor>
): RenderNode => ({
  type: "text",
  x: s.x,
  y: s.y,
  content,
  fontFace: mapFontFace(s.fontFace),
  fontWeight: s.fontBold ? "bold" : "regular",
  fontSize: s.fontSize,
  color,
  align: mapTextAlign(s.textAlign)
});

const feedbackText = (positive: number, negative: number): string => {
  const calculated = positive - negative;
  const sign = calculated > 0 ? "+" : calculated < 0 ? "-" : "";
  return `Feedback: ${sign}${String(calculated)}`;
};

export const buildMemberBannerNodes = (
  data: MemberBannerData,
  settings: MemberBannerSettings
): readonly RenderNode[] => {
  const nodes: RenderNode[] = [];
  const textTheme = getBackgroundTemplateTextTheme(settings.background.template);
  const fontColor = resolveTextColor(textTheme);

  nodes.push({
    type: "image",
    x: 0,
    y: 0,
    width: MEMBER_BANNER_WIDTH,
    height: MEMBER_BANNER_HEIGHT,
    assetKey: settings.background.template
  });

  const logoSize = Math.min(settings.logo.size, MEMBER_BANNER_LOGO_MAX_SIZE);
  const logoY = Math.floor((MEMBER_BANNER_HEIGHT - logoSize) / 2);
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
      makeTextNode(settings.memberName, settings.memberName.display || data.member.name, fontColor)
    );
  }
  if (settings.rank.enable) {
    nodes.push(
      makeTextNode(settings.rank, settings.rank.display || `Rank: ${data.member.rank}`, fontColor)
    );
  }
  if (settings.joined.enable) {
    nodes.push(
      makeTextNode(
        settings.joined,
        settings.joined.display || `Joined: ${data.member.joinDate}`,
        fontColor
      )
    );
  }
  if (settings.posts.enable) {
    nodes.push(
      makeTextNode(
        settings.posts,
        settings.posts.display || `Posts: ${abbreviateNumber(data.member.posts)}`,
        fontColor
      )
    );
  }
  if (settings.likes.enable) {
    nodes.push(
      makeTextNode(
        settings.likes,
        settings.likes.display ||
          feedbackText(data.member.positiveFeedback, data.member.negativeFeedback),
        fontColor
      )
    );
  }

  return nodes;
};
