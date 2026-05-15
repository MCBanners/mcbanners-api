import type { TextNode } from "../nodes/text-node";
import type { WrappedTextNode } from "../nodes/wrapped-text-node";
import type { RenderSurface } from "../types/render-surface";
/**
 * Draws a single line of text onto the surface using the node's font and color.
 * Alignment follows legacy `ImageUtil.drawText` semantics.
 */
export declare const renderTextNode: (surface: RenderSurface, node: TextNode) => void;
/**
 * Draws wrapped text onto the surface. The text is first optionally truncated
 * at a word boundary (`maxChars`), then split into lines that fit within
 * `maxWidth` using the legacy word-wrap algorithm. Each line is drawn at
 * `y + lineIndex * lineHeight`.
 */
export declare const renderWrappedTextNode: (surface: RenderSurface, node: WrappedTextNode) => void;
//# sourceMappingURL=text.d.ts.map
