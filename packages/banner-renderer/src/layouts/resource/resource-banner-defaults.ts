import type { ResourceBannerSettings } from "./resource-banner-settings";

/** Banner canvas pixel width — matches legacy ImageBuilder dimensions. */
export const RESOURCE_BANNER_WIDTH = 300;

/** Banner canvas pixel height — matches legacy ImageBuilder dimensions. */
export const RESOURCE_BANNER_HEIGHT = 100;

/**
 * Maximum logo pixel size.
 * Ported from LogoComponent constructor: maxLogoSize default = 96.
 */
export const RESOURCE_BANNER_LOGO_MAX_SIZE = 96;

/**
 * Star sprite natural pixel size (width and height).
 * Star sprites (star_full.png, star_half.png, star_none.png) are 12×12 px.
 */
export const RESOURCE_BANNER_STAR_SIZE = 12;

/**
 * Default resource banner settings.
 * Directly ported from ResourceParameters.java constructor defaults and
 * GlobalParameters.java for background/logo.
 *
 * Do not change these values without verifying against the legacy Java source.
 */
export const DEFAULT_RESOURCE_BANNER_SETTINGS = {
  background: { template: "MOONLIGHT_PURPLE" },
  logo: { x: 12, size: 80 },
  resourceName: {
    x: 104,
    y: 25,
    fontSize: 18,
    fontBold: true,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  authorName: {
    x: 104,
    y: 42,
    fontSize: 14,
    fontBold: false,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  reviews: {
    x: 104,
    y: 62,
    fontSize: 14,
    fontBold: false,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  updated: {
    x: 104,
    y: 62,
    fontSize: 14,
    fontBold: false,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  stars: {
    x: 180,
    y: 51,
    gap: 14
  },
  downloads: {
    x: 104,
    y: 83,
    fontSize: 14,
    fontBold: false,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  price: {
    x: 210,
    y: 83,
    fontSize: 14,
    fontBold: true,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  }
} as const satisfies ResourceBannerSettings;
