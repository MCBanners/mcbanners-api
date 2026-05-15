import type { RawQuery } from "@mcbanners/domain";
import type { ServerBannerSettings } from "./server-banner-settings";
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
export declare const parseServerBannerSettings: (
  rawQuery: RawQuery | null | undefined
) => ServerBannerSettings;
//# sourceMappingURL=server-banner-params.d.ts.map
