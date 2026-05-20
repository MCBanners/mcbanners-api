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

const applyShadow = (surface: RenderSurface, node: TextNode | WrappedTextNode): void => {
  if (node.shadow !== undefined) {
    surface.context.shadowOffsetX = node.shadow.offsetX;
    surface.context.shadowOffsetY = node.shadow.offsetY;
    surface.context.shadowBlur = node.shadow.blur;
    surface.context.shadowColor = node.shadow.color;
  }
};

const clearShadow = (surface: RenderSurface, node: TextNode | WrappedTextNode): void => {
  if (node.shadow !== undefined) {
    surface.context.shadowOffsetX = 0;
    surface.context.shadowOffsetY = 0;
    surface.context.shadowBlur = 0;
    surface.context.shadowColor = "transparent";
  }
};

/**
 * Draws a single line of text onto the surface using the node's font and color.
 * Alignment follows legacy `ImageUtil.drawText` semantics.
 * Applies optional text shadow if the node carries a shadow preset.
 */
export const renderTextNode = (surface: RenderSurface, node: TextNode): void => {
  surface.context.font = buildFontSpec(node.fontFace, node.fontWeight, node.fontSize);
  surface.context.fillStyle = rgbaColorToString(node.color);
  applyShadow(surface, node);
  drawAligned(surface, node.content, node.x, node.y, node.align);
  clearShadow(surface, node);
};

/**
 * Draws wrapped text onto the surface. The text is first optionally truncated
 * at a word boundary (`maxChars`), then split into lines that fit within
 * `maxWidth` using the legacy word-wrap algorithm. Each line is drawn at
 * `y + lineIndex * lineHeight`.
 * Applies optional text shadow if the node carries a shadow preset.
 */
export const renderWrappedTextNode = (surface: RenderSurface, node: WrappedTextNode): void => {
  surface.context.font = buildFontSpec(node.fontFace, node.fontWeight, node.fontSize);
  surface.context.fillStyle = rgbaColorToString(node.color);
  applyShadow(surface, node);

  const text =
    node.maxChars !== undefined ? truncateText(node.content, node.maxChars) : node.content;

  const measurer = (t: string): number => surface.context.measureText(t).width;
  const lines = wrapText(measurer, text, node.maxWidth);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    drawAligned(surface, line, node.x, node.y + i * node.lineHeight, node.align);
  }

  clearShadow(surface, node);
};
