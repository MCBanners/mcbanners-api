import { backgroundTemplateValues, fontFaceValues, readBooleanParameter, readEnumParameter, readIntegerParameter, readStringParameter, textAlignValues } from "@mcbanners/domain";
import { DEFAULT_SERVER_BANNER_SETTINGS } from "./server-banner-defaults";
/**
 * Parses a single text parameter namespace from rawQuery, falling back to
 * provided defaults for each missing key.
 *
 * Mirrors the per-namespace parsing in ServerParameters.java.
 */
const parseTextNamespace = (namespace, rawQuery, defaults) => ({
    x: readIntegerParameter(namespace, "x", rawQuery, defaults.x) ?? defaults.x,
    y: readIntegerParameter(namespace, "y", rawQuery, defaults.y) ?? defaults.y,
    fontSize: readIntegerParameter(namespace, "font_size", rawQuery, defaults.fontSize) ?? defaults.fontSize,
    fontBold: readBooleanParameter(namespace, "font_bold", rawQuery, defaults.fontBold) ?? defaults.fontBold,
    fontFace: readEnumParameter(namespace, "font_face", rawQuery, fontFaceValues, defaults.fontFace) ??
        defaults.fontFace,
    textAlign: readEnumParameter(namespace, "text_align", rawQuery, textAlignValues, defaults.textAlign) ??
        defaults.textAlign,
    display: readStringParameter(namespace, "display", rawQuery, defaults.display) ?? defaults.display,
    enable: readBooleanParameter(namespace, "enable", rawQuery, defaults.enable) ?? defaults.enable,
    maxChars: readIntegerParameter(namespace, "max_chars", rawQuery, defaults.maxChars) ?? defaults.maxChars
});
/**
 * Parses raw query parameters into a fully-resolved ServerBannerSettings.
 *
 * Missing parameters fall back to DEFAULT_SERVER_BANNER_SETTINGS values,
 * preserving the same defaults as ServerParameters.java.
 *
 * Namespace/key mappings:
 *   background__template, logo__x, logo__size,
 *   server_name__{x,y,font_size,font_bold,font_face,text_align,display,enable,max_chars}
 *   version__{...}, motd__{...}, players__{...}
 */
export const parseServerBannerSettings = (rawQuery) => {
    const d = DEFAULT_SERVER_BANNER_SETTINGS;
    return {
        background: {
            template: readEnumParameter("background", "template", rawQuery, backgroundTemplateValues, d.background.template) ?? d.background.template
        },
        logo: {
            x: readIntegerParameter("logo", "x", rawQuery, d.logo.x) ?? d.logo.x,
            size: readIntegerParameter("logo", "size", rawQuery, d.logo.size) ?? d.logo.size
        },
        serverName: parseTextNamespace("server_name", rawQuery, d.serverName),
        version: parseTextNamespace("version", rawQuery, d.version),
        motd: parseTextNamespace("motd", rawQuery, d.motd),
        players: parseTextNamespace("players", rawQuery, d.players)
    };
};
