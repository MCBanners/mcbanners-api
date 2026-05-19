import { getBackgroundTemplateTextTheme } from "@mcbanners/domain";
import type { ServiceBackend } from "@mcbanners/domain";

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
import { formatUpdatedDate } from "../../text/date-util";
import {
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_LOGO_MAX_SIZE,
  RESOURCE_BANNER_STAR_SIZE,
  RESOURCE_BANNER_WIDTH
} from "./resource-banner-defaults";
import type { ResourceBannerData } from "./resource-banner-data";
import type {
  ResourceBannerSettings,
  ResourceBannerTextSettings
} from "./resource-banner-settings";

/** Backends that show "Updated:" date instead of reviews/stars. */
const UPDATED_DATE_BACKENDS: readonly ServiceBackend[] = ["CURSEFORGE", "MODRINTH"];

/** Backends where stars are not rendered (even when rating average exists). */
const NO_STARS_BACKENDS: readonly ServiceBackend[] = ["CURSEFORGE", "MODRINTH", "HANGAR"];

/** Backend-specific fallback sprite key for the resource logo. */
const backendLogoSpriteKey = (backend: ServiceBackend): string => {
  switch (backend) {
    case "SPIGOT":
      return "DEFAULT_SPIGOT_RES_LOGO";
    case "ORE":
      return "DEFAULT_SPONGE_RES_LOGO";
    case "CURSEFORGE":
      return "DEFAULT_CURSEFORGE_RES_LOGO";
    case "MODRINTH":
      return "DEFAULT_MODRINTH_RES_LOGO";
    case "BUILTBYBIT":
      return "DEFAULT_BUILTBYBIT_RES_LOGO";
    case "POLYMART":
      return "DEFAULT_POLYMART_RES_LOGO";
    case "HANGAR":
      return "DEFAULT_HANGAR_RES_LOGO";
    default:
      return "DEFAULT_SPIGOT_RES_LOGO";
  }
};

const resolveStyleColor = (hexColor: string | null | undefined, fallback: RgbaColor): RgbaColor => {
  if (hexColor === null || hexColor === undefined) return fallback;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return rgbaColor(r, g, b);
};

/** Converts per-element text settings + content string into a TextNode. */
const makeTextNode = (
  s: ResourceBannerTextSettings,
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

/**
 * Builds the ordered render node tree for a marketplace resource banner.
 *
 * Ported from ResourceLayout.java + Layout.java. Nodes are returned in
 * painting order: background → logo → resource name → author → reviews/updated
 * → stars → downloads → price.
 *
 * Compatibility rules preserved:
 * - Logo y is auto-centered: floor((100 - logoSize) / 2)
 * - Logo size is capped at RESOURCE_BANNER_LOGO_MAX_SIZE (96)
 * - Logo falls back to a backend-specific sprite when logoBase64 is null
 * - resourceName.display overrides resource.name unless empty or "unset"
 * - CURSEFORGE/MODRINTH: renders updated date via `updated` namespace
 * - HANGAR: renders "{n} stars" via `reviews` namespace
 * - Others: renders "{n} reviews" via `reviews` namespace
 * - Stars render only when rating.average != null AND backend is not CURSEFORGE/MODRINTH/HANGAR
 * - Star position: x = stars.x + (gap * i), y = stars.y, size = 12×12
 * - Premium resources: "purchases" wording + price field
 * - Free resources: "downloads" wording, no price field
 * - text.enable=false silently omits that element
 */
export const buildResourceBannerNodes = (
  data: ResourceBannerData,
  settings: ResourceBannerSettings,
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

  // Background
  if (style?.background.mode === "solid" && style.background.color !== null) {
    const hex = style.background.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    nodes.push({
      type: "fill-rect",
      x: 0,
      y: 0,
      width: RESOURCE_BANNER_WIDTH,
      height: RESOURCE_BANNER_HEIGHT,
      color: rgbaColor(r, g, b)
    });
  } else {
    nodes.push({
      type: "image",
      x: 0,
      y: 0,
      width: RESOURCE_BANNER_WIDTH,
      height: RESOURCE_BANNER_HEIGHT,
      assetKey: settings.background.template
    });
  }

  // Logo — resource logo (base64) or backend-specific fallback sprite
  const logoSize = Math.min(settings.logo.size, RESOURCE_BANNER_LOGO_MAX_SIZE);
  const logoY = Math.floor((RESOURCE_BANNER_HEIGHT - logoSize) / 2) + (style?.logoYOffset ?? 0);

  if (data.resource.logoBase64 !== null && data.resource.logoBase64 !== "") {
    nodes.push({
      type: "image",
      x: settings.logo.x,
      y: logoY,
      width: logoSize,
      height: logoSize,
      imageData: data.resource.logoBase64
    });
  } else {
    nodes.push({
      type: "sprite",
      x: settings.logo.x,
      y: logoY,
      assetKey: backendLogoSpriteKey(data.backend),
      width: logoSize,
      height: logoSize
    });
  }

  // Resource name — display override unless empty or "unset"
  if (settings.resourceName.enable) {
    const displayOverride = settings.resourceName.display;
    const resourceTitle =
      displayOverride === "" || displayOverride.toLowerCase() === "unset"
        ? data.resource.name
        : displayOverride;
    nodes.push(makeTextNode(settings.resourceName, resourceTitle, primaryColor, shadowForText));
  }

  // Author name: "by {name}"
  if (settings.authorName.enable) {
    const content = settings.authorName.display || `by ${data.author.name}`;
    nodes.push(makeTextNode(settings.authorName, content, secondaryColor, shadowForText));
  }

  // Reviews / Updated — backend-conditional
  if (UPDATED_DATE_BACKENDS.includes(data.backend)) {
    // CurseForge / Modrinth: show "Updated: M/dd/yyyy"
    if (settings.updated.enable) {
      const content =
        settings.updated.display ||
        (data.resource.lastUpdated !== null
          ? `Updated: ${formatUpdatedDate(data.resource.lastUpdated)}`
          : "Updated: unknown");
      nodes.push(makeTextNode(settings.updated, content, secondaryColor, shadowForText));
    }
  } else if (data.backend === "HANGAR") {
    // Hangar: show "{n} stars"
    if (settings.reviews.enable) {
      const content =
        settings.reviews.display || `${abbreviateNumber(data.resource.rating.count)} stars`;
      nodes.push(makeTextNode(settings.reviews, content, secondaryColor, shadowForText));
    }
  } else {
    // All other backends: show "{n} reviews"
    if (settings.reviews.enable) {
      const content =
        settings.reviews.display || `${abbreviateNumber(data.resource.rating.count)} reviews`;
      nodes.push(makeTextNode(settings.reviews, content, secondaryColor, shadowForText));
    }
  }

  // Stars — 5 star sprites, only for supported backends with a rating average
  if (data.resource.rating.average !== null && !NO_STARS_BACKENDS.includes(data.backend)) {
    let remaining = data.resource.rating.average;

    for (let i = 0; i < 5; i++) {
      let starKey: string;

      if (remaining >= 1) {
        remaining -= 1;
        starKey = "STAR_FULL";
      } else if (remaining >= 0.75) {
        remaining -= 0.75;
        starKey = "STAR_FULL";
      } else if (remaining >= 0.25) {
        remaining -= 0.5;
        starKey = "STAR_HALF";
      } else {
        starKey = "STAR_NONE";
      }

      nodes.push({
        type: "sprite",
        x: settings.stars.x + Math.floor(settings.stars.gap * i),
        y: settings.stars.y,
        assetKey: starKey,
        width: RESOURCE_BANNER_STAR_SIZE,
        height: RESOURCE_BANNER_STAR_SIZE
      });
    }
  }

  // Downloads: "{n} downloads" or "{n} purchases" (premium)
  if (settings.downloads.enable) {
    const isPremium = data.resource.price !== null;
    const wording = isPremium ? "purchases" : "downloads";
    const content =
      settings.downloads.display || `${abbreviateNumber(data.resource.downloadCount)} ${wording}`;
    nodes.push(makeTextNode(settings.downloads, content, secondaryColor, shadowForText));
  }

  // Price — only for premium resources
  if (data.resource.price !== null && settings.price.enable) {
    const priceInfo = data.resource.price;
    const content =
      settings.price.display || `${priceInfo.amount.toFixed(2)} ${priceInfo.currency}`;
    nodes.push(makeTextNode(settings.price, content, secondaryColor, shadowForText));
  }

  return nodes;
};
