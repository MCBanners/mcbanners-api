import type { RendererTextAlign } from "../types/text-align";
/**
 * Converts a logical x position and text width into the canvas draw X
 * coordinate that honours the requested alignment.
 *
 * Preserves the alignment semantics of the legacy Java `ImageUtil.drawText`:
 *  - `left`:   draws at `x` directly.
 *  - `center`: centres within `surfaceWidth`, then adds `x` as an offset.
 *  - `right`:  right-aligns within `surfaceWidth`, then adds `x` as an offset.
 *
 * @param surfaceWidth  Width of the render surface in pixels.
 * @param textWidth     Measured rendered width of the string.
 * @param x             The logical x position / additional offset.
 * @param align         Desired text alignment.
 */
export declare const computeAlignedX: (
  surfaceWidth: number,
  textWidth: number,
  x: number,
  align: RendererTextAlign
) => number;
//# sourceMappingURL=align.d.ts.map
