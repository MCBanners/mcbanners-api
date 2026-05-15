import type { ImageNode } from "../nodes/image-node";
import type { SpriteNode } from "../nodes/sprite-node";
import type { RenderSurface } from "../types/render-surface";
/**
 * Draws an image node onto the surface. The image source is either a bundled
 * asset (via `assetKey`) or pre-loaded bytes encoded as base64 (`imageData`).
 * Exactly one of those fields must be present.
 */
export declare const renderImageNode: (surface: RenderSurface, node: ImageNode) => Promise<void>;
/**
 * Draws a sprite onto the surface. Sprites always reference bundled assets by
 * manifest key.
 */
export declare const renderSpriteNode: (surface: RenderSurface, node: SpriteNode) => Promise<void>;
//# sourceMappingURL=image.d.ts.map
