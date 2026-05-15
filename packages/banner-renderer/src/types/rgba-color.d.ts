export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}
export declare const rgbaColor: (r: number, g: number, b: number, a?: number) => RgbaColor;
export declare const rgbaColorToString: (color: RgbaColor) => string;
export declare const WHITE: RgbaColor;
export declare const BLACK: RgbaColor;
export declare const TRANSPARENT: RgbaColor;
//# sourceMappingURL=rgba-color.d.ts.map
