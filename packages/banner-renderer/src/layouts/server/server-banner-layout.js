import { getBackgroundTemplateTextTheme } from "@mcbanners/domain";
import { mapFontFace } from "../../compat/font-face";
import { mapTextAlign } from "../../compat/text-align";
import { resolveTextColor } from "../../compat/text-theme";
import { SERVER_BANNER_HEIGHT, SERVER_BANNER_LOGO_MAX_SIZE, SERVER_BANNER_WRAP_RIGHT_EDGE, SERVER_BANNER_WIDTH } from "./server-banner-defaults";
/** Converts per-element text settings + content string into a TextNode. */
const makeTextNode = (s, content, fontColor) => ({
    type: "text",
    x: s.x,
    y: s.y,
    content,
    fontFace: mapFontFace(s.fontFace),
    fontWeight: s.fontBold ? "bold" : "regular",
    fontSize: s.fontSize,
    color: fontColor,
    align: mapTextAlign(s.textAlign)
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
export const buildServerBannerNodes = (data, settings) => {
    const nodes = [];
    const textTheme = getBackgroundTemplateTextTheme(settings.background.template);
    const fontColor = resolveTextColor(textTheme);
    // Background
    nodes.push({
        type: "image",
        x: 0,
        y: 0,
        width: SERVER_BANNER_WIDTH,
        height: SERVER_BANNER_HEIGHT,
        assetKey: settings.background.template
    });
    // Logo — server icon (base64) or fallback sprite
    const logoSize = Math.min(settings.logo.size, SERVER_BANNER_LOGO_MAX_SIZE);
    const logoY = Math.floor((SERVER_BANNER_HEIGHT - logoSize) / 2);
    if (data.iconBase64 !== null) {
        nodes.push({
            type: "image",
            x: settings.logo.x,
            y: logoY,
            width: logoSize,
            height: logoSize,
            imageData: data.iconBase64
        });
    }
    else {
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
        nodes.push(makeTextNode(settings.serverName, settings.serverName.display || data.name, fontColor));
    }
    // Version
    if (settings.version.enable) {
        nodes.push(makeTextNode(settings.version, settings.version.display || data.version, fontColor));
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
            color: fontColor,
            align: mapTextAlign(settings.motd.textAlign),
            maxWidth: wrapWidth,
            lineHeight: settings.motd.fontSize,
            ...(motdMaxChars < 9999 ? { maxChars: motdMaxChars } : {})
        });
    }
    // Players
    if (settings.players.enable) {
        const raw = `${String(data.onlinePlayers)} / ${String(data.maxPlayers)} players online`;
        nodes.push(makeTextNode(settings.players, settings.players.display || raw, fontColor));
    }
    return nodes;
};
