export const rendererFontFaceValues = [
  "inter",
  "montserrat",
  "open-sans",
  "poppins",
  "raleway",
  "source-sans-pro",
  "jetbrains-mono",
  "roboto"
] as const;

export type RendererFontFace = (typeof rendererFontFaceValues)[number];
