import type { RgbaColor } from "../types/rgba-color";
import type { RendererFontFace } from "../types/font-face";
import type { FontWeight } from "../types/font-weight";
import type { RendererTextAlign } from "../types/text-align";

export interface WrappedTextNode {
  readonly type: "wrapped-text";
  readonly x: number;
  readonly y: number;
  readonly content: string;
  readonly fontFace: RendererFontFace;
  readonly fontWeight: FontWeight;
  readonly fontSize: number;
  readonly color: RgbaColor;
  readonly align: RendererTextAlign;
  /** Maximum line width in pixels before wrapping. */
  readonly maxWidth: number;
  /** Vertical distance between baseline of successive wrapped lines. */
  readonly lineHeight: number;
  /** Optional character limit applied before wrapping (word-boundary aware). */
  readonly maxChars?: number;
}
