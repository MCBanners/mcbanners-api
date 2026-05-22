import { getBackgroundTemplateTextTheme } from "@mcbanners/domain";

import { mapFontFace } from "../../compat/font-face";
import { mapTextAlign } from "../../compat/text-align";
import { resolveTextColor } from "../../compat/text-theme";
import type { RenderNode } from "../../nodes/render-node";
import type { BannerStyleSettings, TextShadow } from "../../style";
import { SHADOW_PRESETS } from "../../style";
import type { RgbaColor } from "../../types/rgba-color";
import { rgbaColor, WHITE } from "../../types/rgba-color";
import type { ServerBannerData } from "./server-banner-data";
import {
  SERVER_BANNER_HEIGHT,
  SERVER_BANNER_LOGO_MAX_SIZE,
  SERVER_BANNER_WIDTH,
  SERVER_BANNER_WRAP_RIGHT_EDGE
} from "./server-banner-defaults";
import type { ServerBannerSettings, ServerBannerTextSettings } from "./server-banner-settings";

const resolveStyleColor = (hexColor: string | null | undefined, fallback: RgbaColor): RgbaColor => {
  if (hexColor === null || hexColor === undefined) return fallback;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return rgbaColor(r, g, b);
};

/** Converts per-element text settings + content string into a TextNode. */
const makeTextNode = (
  s: ServerBannerTextSettings,
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
 * Builds the ordered render node tree for a Minecraft server banner.
 *
 * Ported from ServerLayout.java + Layout.java. Nodes are returned in painting
 * order: background → logo → server name → version → MOTD → players.
 *
 * Compatibility rules preserved:
 * - Logo y is auto-centered: floor((100 - logoSize) / 2)
 * - Logo size is capped at SERVER_BANNER_LOGO_MAX_SIZE (96)
 * - MOTD wraps within SERVER_BANNER_WRAP_RIGHT_EDGE (295) − motd.x
 * - MOTD lineHeight equals the motd fontSize
 * - text.enable=false silently omits that element
 * - text.display overrides computed content when non-empty
 * - maxChars < 9999 is propagated to WrappedTextNode; otherwise omitted
 */
export const buildServerBannerNodes = (
  data: ServerBannerData,
  settings: ServerBannerSettings,
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
      width: SERVER_BANNER_WIDTH,
      height: SERVER_BANNER_HEIGHT,
      color: rgbaColor(r, g, b)
    });
  } else {
    nodes.push({
      type: "image",
      x: 0,
      y: 0,
      width: SERVER_BANNER_WIDTH,
      height: SERVER_BANNER_HEIGHT,
      assetKey: settings.background.template
    });
  }

  // Logo — server icon (base64) or fallback sprite
  const logoSize = Math.min(settings.logo.size, SERVER_BANNER_LOGO_MAX_SIZE);
  const logoY = Math.floor((SERVER_BANNER_HEIGHT - logoSize) / 2) + (style?.logoYOffset ?? 0);

  if (data.iconBase64 !== null) {
    nodes.push({
      type: "image",
      x: settings.logo.x,
      y: logoY,
      width: logoSize,
      height: logoSize,
      imageData: data.iconBase64
    });
  } else {
    nodes.push({
      type: "sprite",
      x: settings.logo.x,
      y: logoY,
      assetKey: "DEFAULT_SERVER_LOGO",
      width: logoSize,
      height: logoSize
    });
  }

  // Server name
  if (settings.serverName.enable) {
    nodes.push(
      makeTextNode(
        settings.serverName,
        settings.serverName.display || data.name,
        primaryColor,
        shadowForText
      )
    );
  }

  // Version
  if (settings.version.enable) {
    nodes.push(
      makeTextNode(
        settings.version,
        settings.version.display || data.version,
        secondaryColor,
        shadowForText
      )
    );
  }

  // MOTD — wrapped text
  if (settings.motd.enable) {
    const content = settings.motd.display || data.motd;
    const wrapWidth = SERVER_BANNER_WRAP_RIGHT_EDGE - settings.motd.x;
    const motdMaxChars = settings.motd.maxChars;

    nodes.push({
      type: "wrapped-text",
      x: settings.motd.x,
      y: settings.motd.y,
      content,
      fontFace: mapFontFace(settings.motd.fontFace),
      fontWeight: settings.motd.fontBold ? "bold" : "regular",
      fontSize: settings.motd.fontSize,
      color: secondaryColor,
      align: mapTextAlign(settings.motd.textAlign),
      maxWidth: wrapWidth,
      lineHeight: settings.motd.fontSize,
      ...(motdMaxChars < 9999 ? { maxChars: motdMaxChars } : {}),
      ...(shadowForText !== undefined ? { shadow: shadowForText } : {})
    });
  }

  // Players
  if (settings.players.enable) {
    const raw = `${String(data.onlinePlayers)} / ${String(data.maxPlayers)} players online`;
    nodes.push(
      makeTextNode(settings.players, settings.players.display || raw, secondaryColor, shadowForText)
    );
  }

  return nodes;
};
