import { createCanvas } from "@napi-rs/canvas";

import type { RenderSurface } from "../types/render-surface";

/**
 * Allocates a fresh canvas and 2D rendering context at the given dimensions.
 * The returned surface is the unit of work passed to all renderer primitives.
 */
export const createCanvasSurface = (width: number, height: number): RenderSurface => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  return { canvas, context, width, height };
};
