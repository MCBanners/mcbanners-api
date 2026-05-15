export const fontWeightValues = ["regular", "bold"] as const;
export type FontWeight = (typeof fontWeightValues)[number];
