import type { TeamBannerSettings, TeamBannerTextSettings } from "./team-banner-settings";

export const TEAM_BANNER_WIDTH = 300;
export const TEAM_BANNER_HEIGHT = 100;
export const TEAM_BANNER_LOGO_MAX_SIZE = 96;

const defaultText = (x: number, y: number): TeamBannerTextSettings => ({
  x,
  y,
  fontSize: 14,
  fontBold: false,
  fontFace: "SOURCE_SANS_PRO",
  textAlign: "LEFT",
  display: "",
  enable: true,
  maxChars: 9999
});

export const DEFAULT_TEAM_BANNER_SETTINGS = {
  background: { template: "MOONLIGHT_PURPLE" },
  logo: { x: 12, size: 80 },
  teamName: {
    ...defaultText(104, 22),
    fontSize: 18,
    fontBold: true
  },
  resourceCount: defaultText(104, 38),
  downloads: defaultText(104, 72),
  ratings: defaultText(104, 89)
} as const satisfies TeamBannerSettings;
