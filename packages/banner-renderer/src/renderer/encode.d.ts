import type { RenderSurface } from "../types/render-surface";
/**
 * Encodes the current surface contents as a PNG buffer.
 * Output is deterministic for identical canvas state.
 */
export declare const encodePng: (surface: RenderSurface) => Promise<Buffer>;
/**
 * Encodes the current surface contents as a JPEG buffer.
 *
 * @param surface  The render surface to encode.
 * @param quality  JPEG quality 0–100 (default 90, matching legacy behavior).
 */
export declare const encodeJpg: (surface: RenderSurface, quality?: number) => Promise<Buffer>;
//# sourceMappingURL=encode.d.ts.map
