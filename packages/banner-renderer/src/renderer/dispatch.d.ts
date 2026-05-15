import type { RenderNode } from "../nodes/render-node";
import type { RenderSurface } from "../types/render-surface";
/**
 * Dispatches a single render node to its appropriate primitive renderer.
 * All nodes in a tree should be processed through this function for
 * consistent ordering and exhaustive type coverage.
 */
export declare const renderNode: (surface: RenderSurface, node: RenderNode) => Promise<void>;
//# sourceMappingURL=dispatch.d.ts.map
