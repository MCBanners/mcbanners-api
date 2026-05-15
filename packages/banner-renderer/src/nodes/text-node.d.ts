import type { RgbaColor } from "../types/rgba-color";
import type { RendererFontFace } from "../types/font-face";
import type { FontWeight } from "../types/font-weight";
import type { RendererTextAlign } from "../types/text-align";
export interface TextNode {
  readonly type: "text";
  readonly x: number;
  readonly y: number;
  readonly content: string;
  readonly fontFace: RendererFontFace;
  readonly fontWeight: FontWeight;
  readonly fontSize: number;
  readonly color: RgbaColor;
  readonly align: RendererTextAlign;
}
//# sourceMappingURL=text-node.d.ts.map
