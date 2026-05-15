export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export const rgbaColor = (r: number, g: number, b: number, a = 255): RgbaColor => ({
  r,
  g,
  b,
  a
});

export const rgbaColorToString = (color: RgbaColor): string =>
  `rgba(${String(color.r)},${String(color.g)},${String(color.b)},${String(color.a / 255)})`;

export const WHITE: RgbaColor = rgbaColor(255, 255, 255);
export const BLACK: RgbaColor = rgbaColor(0, 0, 0);
export const TRANSPARENT: RgbaColor = rgbaColor(0, 0, 0, 0);
