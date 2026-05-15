/**
 * Maps a domain TextAlign (UPPER, from compatibility query params) to
 * the renderer-internal RendererTextAlign (lowercase).
 *
 * Ported from TextAlign.java enum constants.
 */
const TEXT_ALIGN_MAP = {
    RIGHT: "right",
    CENTER: "center",
    LEFT: "left"
};
export const mapTextAlign = (textAlign) => TEXT_ALIGN_MAP[textAlign];
