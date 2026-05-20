import type { RgbaColor } from "../types/rgba-color";

export interface FillRectNode {
  readonly type: "fill-rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: RgbaColor;
}
