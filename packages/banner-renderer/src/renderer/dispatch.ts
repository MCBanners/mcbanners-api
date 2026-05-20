import type { RenderNode } from "../nodes/render-node";
import type { RenderSurface } from "../types/render-surface";
import { renderTextNode } from "./text";
import { renderWrappedTextNode } from "./text";
import { renderImageNode } from "./image";
import { renderSpriteNode } from "./image";
import { renderDebugNode } from "./debug";
import { renderFillRectNode } from "./fill";

/**
 * Dispatches a single render node to its appropriate primitive renderer.
 * All nodes in a tree should be processed through this function for
 * consistent ordering and exhaustive type coverage.
 */
export const renderNode = async (surface: RenderSurface, node: RenderNode): Promise<void> => {
  switch (node.type) {
    case "text":
      renderTextNode(surface, node);
      break;
    case "wrapped-text":
      renderWrappedTextNode(surface, node);
      break;
    case "image":
      await renderImageNode(surface, node);
      break;
    case "sprite":
      await renderSpriteNode(surface, node);
      break;
    case "debug":
      renderDebugNode(surface, node);
      break;
    case "fill-rect":
      renderFillRectNode(surface, node);
      break;
  }
};
