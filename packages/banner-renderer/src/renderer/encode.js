/**
 * Encodes the current surface contents as a PNG buffer.
 * Output is deterministic for identical canvas state.
 */
export const encodePng = async (surface) => await surface.canvas.encode("png");
/**
 * Encodes the current surface contents as a JPEG buffer.
 *
 * @param surface  The render surface to encode.
 * @param quality  JPEG quality 0–100 (default 90, matching legacy behavior).
 */
export const encodeJpg = async (surface, quality = 90) => await surface.canvas.encode("jpeg", quality);
