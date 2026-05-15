/**
 * Maps a domain FontFace (UPPER_SNAKE, from compatibility query params) to
 * the renderer-internal RendererFontFace (lowercase-hyphen).
 *
 * Ported from FontFace.java enum constants.
 */
const FONT_FACE_MAP = {
    MONTSERRAT: "montserrat",
    OPEN_SANS: "open-sans",
    POPPINS: "poppins",
    RALEWAY: "raleway",
    SOURCE_SANS_PRO: "source-sans-pro",
    JETBRAINS_MONO: "jetbrains-mono",
    INTER: "inter",
    ROBOTO: "roboto"
};
export const mapFontFace = (fontFace) => FONT_FACE_MAP[fontFace];
