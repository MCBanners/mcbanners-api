import type { BackgroundTemplate, FontFace, TextAlign } from "@mcbanners/domain";

export interface AuthorBannerTextSettings {
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

export interface AuthorBannerLogoSettings {
  readonly x: number;
  readonly size: number;
}

export interface AuthorBannerBackgroundSettings {
  readonly template: BackgroundTemplate;
}

export interface AuthorBannerSettings {
  readonly background: AuthorBannerBackgroundSettings;
  readonly logo: AuthorBannerLogoSettings;
  readonly authorName: AuthorBannerTextSettings;
  readonly resourceCount: AuthorBannerTextSettings;
  readonly likes: AuthorBannerTextSettings;
  readonly downloads: AuthorBannerTextSettings;
  readonly reviews: AuthorBannerTextSettings;
}
