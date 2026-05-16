import { getBackgroundTemplateTextTheme } from "@mcbanners/domain";

import { mapFontFace } from "../../compat/font-face";
import { mapTextAlign } from "../../compat/text-align";
import { resolveTextColor } from "../../compat/text-theme";
import type { RenderNode } from "../../nodes/render-node";
import { abbreviateNumber } from "../../text/number-util";
import {
  TEAM_BANNER_HEIGHT,
  TEAM_BANNER_LOGO_MAX_SIZE,
  TEAM_BANNER_WIDTH
} from "./team-banner-defaults";
import type { TeamBannerData } from "./team-banner-data";
import type { TeamBannerSettings, TeamBannerTextSettings } from "./team-banner-settings";

const makeTextNode = (
  s: TeamBannerTextSettings,
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

export const buildTeamBannerNodes = (
  data: TeamBannerData,
  settings: TeamBannerSettings
): readonly RenderNode[] => {
  const nodes: RenderNode[] = [];
  const textTheme = getBackgroundTemplateTextTheme(settings.background.template);
  const fontColor = resolveTextColor(textTheme);

  nodes.push({
    type: "image",
    x: 0,
    y: 0,
    width: TEAM_BANNER_WIDTH,
    height: TEAM_BANNER_HEIGHT,
    assetKey: settings.background.template
  });

  const logoSize = Math.min(settings.logo.size, TEAM_BANNER_LOGO_MAX_SIZE);
  const logoY = Math.floor((TEAM_BANNER_HEIGHT - logoSize) / 2);
  if (data.team.logoBase64 !== null && data.team.logoBase64 !== "") {
    nodes.push({
      type: "image",
      x: settings.logo.x,
      y: logoY,
      width: logoSize,
      height: logoSize,
      imageData: data.team.logoBase64
    });
  } else {
    nodes.push({
      type: "sprite",
      x: settings.logo.x,
      y: logoY,
      width: logoSize,
      height: logoSize,
      assetKey: "DEFAULT_POLYMART_RES_LOGO"
    });
  }

  if (settings.teamName.enable) {
    nodes.push(
      makeTextNode(settings.teamName, settings.teamName.display || data.team.name, fontColor)
    );
  }
  if (settings.resourceCount.enable) {
    nodes.push(
      makeTextNode(
        settings.resourceCount,
        settings.resourceCount.display || `${String(data.team.resourceCount)} resources`,
        fontColor
      )
    );
  }
  if (settings.downloads.enable) {
    nodes.push(
      makeTextNode(
        settings.downloads,
        settings.downloads.display || `${abbreviateNumber(data.team.resourceDownloads)} downloads`,
        fontColor
      )
    );
  }
  if (settings.ratings.enable) {
    nodes.push(
      makeTextNode(
        settings.ratings,
        settings.ratings.display || `${abbreviateNumber(data.team.resourceRatings)} ratings`,
        fontColor
      )
    );
  }

  return nodes;
};
