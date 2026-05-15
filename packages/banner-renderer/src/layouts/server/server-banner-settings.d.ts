import type { BackgroundTemplate, FontFace, TextAlign } from "@mcbanners/domain";
/**
 * Per-element text settings for a server banner field.
 * Mirrors the fields in TextParameterNamespace.java.
 */
export interface ServerBannerTextSettings {
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fontBold: boolean;
  readonly fontFace: FontFace;
  readonly textAlign: TextAlign;
  /** When non-empty, overrides the computed content with a literal display string. */
  readonly display: string;
  readonly enable: boolean;
  /** Maximum character count before word-boundary truncation. 9999 = unlimited. */
  readonly maxChars: number;
}
/** Positioning and size settings for the server icon / fallback logo. */
export interface ServerBannerLogoSettings {
  readonly x: number;
  readonly size: number;
}
/** Background template selector. */
export interface ServerBannerBackgroundSettings {
  readonly template: BackgroundTemplate;
}
/**
 * Full, resolved settings for a Minecraft server banner.
 * All fields are populated (defaults or user overrides) — no nulls.
 * Ported from ServerParameters.java + GlobalParameters.java.
 */
export interface ServerBannerSettings {
  readonly background: ServerBannerBackgroundSettings;
  readonly logo: ServerBannerLogoSettings;
  readonly serverName: ServerBannerTextSettings;
  readonly version: ServerBannerTextSettings;
  readonly motd: ServerBannerTextSettings;
  readonly players: ServerBannerTextSettings;
}
//# sourceMappingURL=server-banner-settings.d.ts.map
