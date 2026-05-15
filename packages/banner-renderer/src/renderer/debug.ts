import type { DebugNode } from "../nodes/debug-node";
import type { RenderSurface } from "../types/render-surface";
import { rgbaColorToString } from "../types/rgba-color";

/**
 * Draws a labeled bounding-box overlay onto the surface for debugging layout
 * bounds at development time. Not intended for production render trees.
 */
export const renderDebugNode = (surface: RenderSurface, node: DebugNode): void => {
  const { context } = surface;
  const colorString = rgbaColorToString(node.color);

  context.strokeStyle = colorString;
  context.lineWidth = 1;
  context.strokeRect(node.x + 0.5, node.y + 0.5, node.width - 1, node.height - 1);

  context.fillStyle = colorString;
  context.font = "10px sans-serif";
  context.fillText(node.label, node.x + 2, node.y + 11);
};
