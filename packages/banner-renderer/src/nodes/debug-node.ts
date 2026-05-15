import type { RgbaColor } from "../types/rgba-color";

export interface DebugNode {
  readonly type: "debug";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly color: RgbaColor;
}
