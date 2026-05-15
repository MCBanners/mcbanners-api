import type { RenderNode } from "../../nodes/render-node";
import type { ServerBannerData } from "./server-banner-data";
import type { ServerBannerSettings } from "./server-banner-settings";
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
export declare const buildServerBannerNodes: (
  data: ServerBannerData,
  settings: ServerBannerSettings
) => readonly RenderNode[];
//# sourceMappingURL=server-banner-layout.d.ts.map
