export type ShadowPreset = "none" | "soft" | "strong";
export const shadowPresetValues = ["none", "soft", "strong"] as const;

export interface TextShadow {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly color: string; // CSS rgba() string
}

export const SHADOW_PRESETS: Record<ShadowPreset, TextShadow | null> = {
  none: null,
  soft: { offsetX: 1, offsetY: 1, blur: 2, color: "rgba(0,0,0,0.45)" },
  strong: { offsetX: 2, offsetY: 2, blur: 4, color: "rgba(0,0,0,0.75)" }
};
