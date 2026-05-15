import type { Canvas, SKRSContext2D } from "@napi-rs/canvas";

export interface RenderSurface {
  readonly canvas: Canvas;
  readonly context: SKRSContext2D;
  readonly width: number;
  readonly height: number;
}
