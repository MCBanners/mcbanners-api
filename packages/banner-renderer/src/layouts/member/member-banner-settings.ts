import type { BackgroundTemplate, FontFace, TextAlign } from "@mcbanners/domain";

export interface MemberBannerTextSettings {
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fontBold: boolean;
  readonly fontFace: FontFace;
  readonly textAlign: TextAlign;
  readonly display: string;
  readonly enable: boolean;
  readonly maxChars: number;
}

export interface MemberBannerLogoSettings {
  readonly x: number;
  readonly size: number;
}

export interface MemberBannerBackgroundSettings {
  readonly template: BackgroundTemplate;
}

export interface MemberBannerSettings {
  readonly background: MemberBannerBackgroundSettings;
  readonly logo: MemberBannerLogoSettings;
  readonly memberName: MemberBannerTextSettings;
  readonly rank: MemberBannerTextSettings;
  readonly joined: MemberBannerTextSettings;
  readonly posts: MemberBannerTextSettings;
  readonly likes: MemberBannerTextSettings;
}
