import type { BackgroundTemplate, FontFace, TextAlign } from "@mcbanners/domain";

/**
 * Per-element text settings for a resource banner field.
 * Mirrors the fields in TextParameterNamespace.java.
 */
export interface ResourceBannerTextSettings {
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fontBold: boolean;
  readonly fontFace: FontFace;
  readonly textAlign: TextAlign;
  /** When non-empty (and not "unset" for resourceName), overrides computed content. */
  readonly display: string;
  readonly enable: boolean;
  /** Maximum character count before truncation. 9999 = unlimited. */
  readonly maxChars: number;
}

/** Positioning and size settings for the resource logo. */
export interface ResourceBannerLogoSettings {
  readonly x: number;
  readonly size: number;
}

/** Background template selector. */
export interface ResourceBannerBackgroundSettings {
  readonly template: BackgroundTemplate;
}

/**
 * Positioning settings for the 5-star rating row.
 * Mirrors SpaceableParameterNamespace.java for the "stars" namespace.
 */
export interface ResourceBannerStarsSettings {
  readonly x: number;
  readonly y: number;
  /** Pixel stride between each star's x position. */
  readonly gap: number;
}

/**
 * Full, resolved settings for a resource banner.
 * All fields are populated (defaults or user overrides) — no nulls.
 * Ported from ResourceParameters.java + GlobalParameters.java.
 */
export interface ResourceBannerSettings {
  readonly background: ResourceBannerBackgroundSettings;
  readonly logo: ResourceBannerLogoSettings;
  readonly resourceName: ResourceBannerTextSettings;
  readonly authorName: ResourceBannerTextSettings;
  /**
   * Used for Hangar ({n} stars) and non-CurseForge/Modrinth/Hangar ({n} reviews).
   * Not rendered for CurseForge/Modrinth backends (updated is used instead).
   */
  readonly reviews: ResourceBannerTextSettings;
  /**
   * Used for CurseForge/Modrinth backends: "Updated: M/dd/yyyy".
   * Shares default y=62 with reviews.
   */
  readonly updated: ResourceBannerTextSettings;
  readonly stars: ResourceBannerStarsSettings;
  readonly downloads: ResourceBannerTextSettings;
  /** Only rendered when resource.price is non-null (premium resources). */
  readonly price: ResourceBannerTextSettings;
}
