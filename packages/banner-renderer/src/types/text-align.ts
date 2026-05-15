export const rendererTextAlignValues = ["left", "center", "right"] as const;
export type RendererTextAlign = (typeof rendererTextAlignValues)[number];
