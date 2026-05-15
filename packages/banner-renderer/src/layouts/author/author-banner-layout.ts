import { getBackgroundTemplateTextTheme, type ServiceBackend } from "@mcbanners/domain";

import { mapFontFace } from "../../compat/font-face";
import { mapTextAlign } from "../../compat/text-align";
import { resolveTextColor } from "../../compat/text-theme";
import type { RenderNode } from "../../nodes/render-node";
import { abbreviateNumber } from "../../text/number-util";
import {
  AUTHOR_BANNER_HEIGHT,
  AUTHOR_BANNER_LOGO_MAX_SIZE,
  AUTHOR_BANNER_WIDTH
} from "./author-banner-defaults";
import type { AuthorBannerData } from "./author-banner-data";
import type { AuthorBannerSettings, AuthorBannerTextSettings } from "./author-banner-settings";

const makeTextNode = (
  s: AuthorBannerTextSettings,
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

const likesWord = (backend: ServiceBackend): string => {
  switch (backend) {
    case "MODRINTH":
      return "followers";
    case "HANGAR":
      return "stars";
    default:
      return "likes";
  }
};

const reviewsWord = (backend: ServiceBackend): string =>
  backend === "HANGAR" ? "views" : "reviews";

export const buildAuthorBannerNodes = (
  data: AuthorBannerData,
  settings: AuthorBannerSettings
): readonly RenderNode[] => {
  const nodes: RenderNode[] = [];
  const textTheme = getBackgroundTemplateTextTheme(settings.background.template);
  const fontColor = resolveTextColor(textTheme);

  nodes.push({
    type: "image",
    x: 0,
    y: 0,
    width: AUTHOR_BANNER_WIDTH,
    height: AUTHOR_BANNER_HEIGHT,
    assetKey: settings.background.template
  });

  const logoSize = Math.min(settings.logo.size, AUTHOR_BANNER_LOGO_MAX_SIZE);
  const logoY = Math.floor((AUTHOR_BANNER_HEIGHT - logoSize) / 2);
  if (data.author.logoBase64 !== null && data.author.logoBase64 !== "") {
    nodes.push({
      type: "image",
      x: settings.logo.x,
      y: logoY,
      width: logoSize,
      height: logoSize,
      imageData: data.author.logoBase64
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

  if (settings.authorName.enable) {
    nodes.push(
      makeTextNode(settings.authorName, settings.authorName.display || data.author.name, fontColor)
    );
  }

  if (settings.resourceCount.enable) {
    nodes.push(
      makeTextNode(
        settings.resourceCount,
        settings.resourceCount.display || `${String(data.author.resourceCount)} resources`,
        fontColor
      )
    );
  }

  if (data.author.likes !== null && settings.likes.enable) {
    nodes.push(
      makeTextNode(
        settings.likes,
        settings.likes.display ||
          `${abbreviateNumber(data.author.likes)} ${likesWord(data.backend)}`,
        fontColor
      )
    );
  }

  if (settings.downloads.enable) {
    nodes.push(
      makeTextNode(
        settings.downloads,
        settings.downloads.display || `${abbreviateNumber(data.author.downloadCount)} downloads`,
        fontColor
      )
    );
  }

  if (data.author.reviews !== null && settings.reviews.enable) {
    nodes.push(
      makeTextNode(
        settings.reviews,
        settings.reviews.display ||
          `${abbreviateNumber(data.author.reviews)} ${reviewsWord(data.backend)}`,
        fontColor
      )
    );
  }

  return nodes;
};
