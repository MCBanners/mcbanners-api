import type { ShadowPreset } from "./shadow-preset";

export interface BannerStyleBackground {
  readonly mode: "template" | "solid";
  readonly color: string | null; // canonical #rrggbb, only meaningful for solid
}

export interface BannerStyleText {
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly accentColor: string | null;
}

export interface BannerStyleSettings {
  readonly version: 1;
  readonly background: BannerStyleBackground;
  readonly text: BannerStyleText;
  readonly shadowPreset: ShadowPreset | null;
  readonly logoYOffset: number;
}
