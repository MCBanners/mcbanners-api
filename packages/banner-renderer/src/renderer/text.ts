import type { TextNode } from "../nodes/text-node";
import type { WrappedTextNode } from "../nodes/wrapped-text-node";
import type { RendererTextAlign } from "../types/text-align";
import type { RenderSurface } from "../types/render-surface";
import { rgbaColorToString } from "../types/rgba-color";
import { wrapText } from "../text/wrap";
import { truncateText } from "../text/truncate";
import { computeAlignedX } from "../text/align";
import { buildFontSpec } from "./font-registry";

const drawAligned = (
  surface: RenderSurface,
  text: string,
  x: number,
  y: number,
  align: RendererTextAlign
): void => {
  const textWidth = surface.context.measureText(text).width;
  const drawX = computeAlignedX(surface.width, textWidth, x, align);
  surface.context.fillText(text, drawX, y);
};

/**
 * Draws a single line of text onto the surface using the node's font and color.
 * Alignment follows legacy `ImageUtil.drawText` semantics.
 */
export const renderTextNode = (surface: RenderSurface, node: TextNode): void => {
  surface.context.font = buildFontSpec(node.fontFace, node.fontWeight, node.fontSize);
  surface.context.fillStyle = rgbaColorToString(node.color);
  drawAligned(surface, node.content, node.x, node.y, node.align);
};

/**
 * Draws wrapped text onto the surface. The text is first optionally truncated
 * at a word boundary (`maxChars`), then split into lines that fit within
 * `maxWidth` using the legacy word-wrap algorithm. Each line is drawn at
 * `y + lineIndex * lineHeight`.
 */
export const renderWrappedTextNode = (surface: RenderSurface, node: WrappedTextNode): void => {
  surface.context.font = buildFontSpec(node.fontFace, node.fontWeight, node.fontSize);
  surface.context.fillStyle = rgbaColorToString(node.color);

  const text =
    node.maxChars !== undefined ? truncateText(node.content, node.maxChars) : node.content;

  const measurer = (t: string): number => surface.context.measureText(t).width;
  const lines = wrapText(measurer, text, node.maxWidth);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    drawAligned(surface, line, node.x, node.y + i * node.lineHeight, node.align);
  }
};
