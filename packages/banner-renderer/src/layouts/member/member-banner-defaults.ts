import type { MemberBannerSettings, MemberBannerTextSettings } from "./member-banner-settings";

export const MEMBER_BANNER_WIDTH = 300;
export const MEMBER_BANNER_HEIGHT = 100;
export const MEMBER_BANNER_LOGO_MAX_SIZE = 96;

const defaultText = (x: number, y: number): MemberBannerTextSettings => ({
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

export const DEFAULT_MEMBER_BANNER_SETTINGS = {
  background: { template: "MOONLIGHT_PURPLE" },
  logo: { x: 12, size: 80 },
  memberName: {
    ...defaultText(104, 22),
    fontSize: 18,
    fontBold: true
  },
  rank: defaultText(104, 37),
  joined: defaultText(104, 55),
  posts: defaultText(104, 72),
  likes: defaultText(104, 89)
} as const satisfies MemberBannerSettings;
