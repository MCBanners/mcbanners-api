import type { FillRectNode } from "../nodes/fill-rect-node";
import type { RenderSurface } from "../types/render-surface";
import { rgbaColorToString } from "../types/rgba-color";

/**
 * Fills a rectangular region of the surface with a solid color.
 * Used for solid-color background rendering in the Customization v1 style layer.
 */
export const renderFillRectNode = (surface: RenderSurface, node: FillRectNode): void => {
  surface.context.fillStyle = rgbaColorToString(node.color);
  surface.context.fillRect(node.x, node.y, node.width, node.height);
};
