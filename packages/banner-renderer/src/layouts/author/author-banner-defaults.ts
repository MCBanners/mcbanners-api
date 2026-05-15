import type { AuthorBannerSettings } from "./author-banner-settings";

export const AUTHOR_BANNER_WIDTH = 300;
export const AUTHOR_BANNER_HEIGHT = 100;
export const AUTHOR_BANNER_LOGO_MAX_SIZE = 96;

export const DEFAULT_AUTHOR_BANNER_SETTINGS = {
  background: { template: "MOONLIGHT_PURPLE" },
  logo: { x: 12, size: 80 },
  authorName: {
    x: 104,
    y: 22,
    fontSize: 18,
    fontBold: true,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  resourceCount: {
    x: 104,
    y: 38,
    fontSize: 14,
    fontBold: false,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  likes: {
    x: 104,
    y: 55,
    fontSize: 14,
    fontBold: false,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  },
  downloads: {
    x: 104,
    y: 72,
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
    y: 89,
    fontSize: 14,
    fontBold: false,
    fontFace: "SOURCE_SANS_PRO",
    textAlign: "LEFT",
    display: "",
    enable: true,
    maxChars: 9999
  }
} as const satisfies AuthorBannerSettings;
