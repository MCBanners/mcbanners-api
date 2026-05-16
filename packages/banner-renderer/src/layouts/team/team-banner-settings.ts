import type { BackgroundTemplate, FontFace, TextAlign } from "@mcbanners/domain";

export interface TeamBannerTextSettings {
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

export interface TeamBannerLogoSettings {
  readonly x: number;
  readonly size: number;
}

export interface TeamBannerBackgroundSettings {
  readonly template: BackgroundTemplate;
}

export interface TeamBannerSettings {
  readonly background: TeamBannerBackgroundSettings;
  readonly logo: TeamBannerLogoSettings;
  readonly teamName: TeamBannerTextSettings;
  readonly resourceCount: TeamBannerTextSettings;
  readonly downloads: TeamBannerTextSettings;
  readonly ratings: TeamBannerTextSettings;
}
