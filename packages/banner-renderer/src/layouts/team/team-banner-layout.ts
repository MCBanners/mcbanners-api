import { getBackgroundTemplateTextTheme } from "@mcbanners/domain";

import { mapFontFace } from "../../compat/font-face";
import { mapTextAlign } from "../../compat/text-align";
import { resolveTextColor } from "../../compat/text-theme";
import type { RenderNode } from "../../nodes/render-node";
import type { BannerStyleSettings, TextShadow } from "../../style";
import { SHADOW_PRESETS } from "../../style";
import { abbreviateNumber } from "../../text/number-util";
import type { RgbaColor } from "../../types/rgba-color";
import { rgbaColor, WHITE } from "../../types/rgba-color";
import type { TeamBannerData } from "./team-banner-data";
import {
  TEAM_BANNER_HEIGHT,
  TEAM_BANNER_LOGO_MAX_SIZE,
  TEAM_BANNER_WIDTH
} from "./team-banner-defaults";
import type { TeamBannerSettings, TeamBannerTextSettings } from "./team-banner-settings";

const resolveStyleColor = (hexColor: string | null | undefined, fallback: RgbaColor): RgbaColor => {
  if (hexColor === null || hexColor === undefined) return fallback;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return rgbaColor(r, g, b);
};

const makeTextNode = (
  s: TeamBannerTextSettings,
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

export const buildTeamBannerNodes = (
  data: TeamBannerData,
  settings: TeamBannerSettings,
  style?: BannerStyleSettings | null
): readonly RenderNode[] => {
  const nodes: RenderNode[] = [];

  const textTheme = getBackgroundTemplateTextTheme(settings.background.template);
  const templateFontColor = resolveTextColor(textTheme);
  const baseColor = style?.background.mode === "solid" ? WHITE : templateFontColor;

  const primaryColor =
    style?.text.primaryColor != null
      ? resolveStyleColor(style.text.primaryColor, baseColor)
      : baseColor;
  const secondaryColor =
    style?.text.secondaryColor != null
      ? resolveStyleColor(style.text.secondaryColor, baseColor)
      : baseColor;

  const shadowForText: TextShadow | undefined =
    style?.shadowPreset != null ? (SHADOW_PRESETS[style.shadowPreset] ?? undefined) : undefined;

  if (style?.background.mode === "solid" && style.background.color !== null) {
    const hex = style.background.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    nodes.push({
      type: "fill-rect",
      x: 0,
      y: 0,
      width: TEAM_BANNER_WIDTH,
      height: TEAM_BANNER_HEIGHT,
      color: rgbaColor(r, g, b)
    });
  } else {
    nodes.push({
      type: "image",
      x: 0,
      y: 0,
      width: TEAM_BANNER_WIDTH,
      height: TEAM_BANNER_HEIGHT,
      assetKey: settings.background.template
    });
  }

  const logoSize = Math.min(settings.logo.size, TEAM_BANNER_LOGO_MAX_SIZE);
  const logoY = Math.floor((TEAM_BANNER_HEIGHT - logoSize) / 2) + (style?.logoYOffset ?? 0);
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
      makeTextNode(
        settings.teamName,
        settings.teamName.display || data.team.name,
        primaryColor,
        shadowForText
      )
    );
  }
  if (settings.resourceCount.enable) {
    nodes.push(
      makeTextNode(
        settings.resourceCount,
        settings.resourceCount.display || `${String(data.team.resourceCount)} resources`,
        secondaryColor,
        shadowForText
      )
    );
  }
  if (settings.downloads.enable) {
    nodes.push(
      makeTextNode(
        settings.downloads,
        settings.downloads.display || `${abbreviateNumber(data.team.resourceDownloads)} downloads`,
        secondaryColor,
        shadowForText
      )
    );
  }
  if (settings.ratings.enable) {
    nodes.push(
      makeTextNode(
        settings.ratings,
        settings.ratings.display || `${abbreviateNumber(data.team.resourceRatings)} ratings`,
        secondaryColor,
        shadowForText
      )
    );
  }

  return nodes;
};
